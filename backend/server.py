from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import joblib, json
import shap
import io, os
import google.generativeai as genai

app = FastAPI(title="Smart KYC Risk Scoring Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Load ML Artifacts on Startup
rf_model = joblib.load('kyc_rf_model.joblib')
preprocessor = joblib.load('kyc_preprocessor.joblib')

# Initialize SHAP explainer
explainer = shap.TreeExplainer(rf_model)

# Configure Gemini API
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("WARNING: GEMINI_API_KEY environment variable not set. LLM explanations will fallback to raw features.")
genai.configure(api_key=api_key)

# We use gemini-1.5-flash as it is extremely fast and cost-effective for high-volume text tasks
llm_model = genai.GenerativeModel('gemini-2.0-flash')

# Define column definitions matching the training environment
id_col = 'customer_id'
categorical_cols = ['country_risk', 'occupation', 'account_type', 'document_status', 'age_group']
numerical_cols = ['age', 'annual_income', 'customer_tenure_years', 'digital_risk_score', 'monthly_txn_count', 'txn_to_income_ratio']
binary_flags = ['address_verified', 'pep_flag', 'sanctions_flag', 'adverse_media_flag', 'fraud_history_flag', 'is_new_customer', 'compliance_risk_composite', 'document_completeness_score']

def preprocess_and_engineer(df: pd.DataFrame) -> pd.DataFrame:
    df_clean = df.copy()
    bool_mapping = {'Yes': 1, 'No': 0, 'yes': 1, 'no': 0, 'Y': 1, 'N': 0, 'True': 1, 'False': 0, '1': 1, '0': 0}
    raw_flags = ['address_verified', 'pep_flag', 'sanctions_flag', 'adverse_media_flag', 'fraud_history_flag']
    
    for col in raw_flags:
        if df_clean[col].dtype == 'object':
            df_clean[col] = df_clean[col].replace(bool_mapping)
        df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce').fillna(0).astype(int)

    df_clean['compliance_risk_composite'] = df_clean['pep_flag'] + df_clean['sanctions_flag'] + df_clean['adverse_media_flag']
    is_doc_complete = (df_clean['document_status'] == 'Complete').astype(int)
    df_clean['document_completeness_score'] = is_doc_complete + df_clean['address_verified']
    df_clean['txn_to_income_ratio'] = df_clean['monthly_txn_count'] / (df_clean['annual_income'] + 1)
    df_clean['is_new_customer'] = (df_clean['customer_tenure_years'] == 0).astype(int)
    df_clean['age_group'] = pd.cut(df_clean['age'], bins=[0, 20, 60, 150], labels=['Under 20', '20-60', 'Over 60'])
    return df_clean

def calculate_heuristic_score(df: pd.DataFrame) -> pd.Series:
    score = pd.Series(0, index=df.index)
    score += df['sanctions_flag'] * 50
    score += df['fraud_history_flag'] * 30
    score += df['pep_flag'] * 15
    score += df['adverse_media_flag'] * 15
    score += df['document_status'].apply(lambda x: 15 if x in ['Expired', 'Incomplete'] else 0)
    score += df['country_risk'].apply(lambda x: 15 if x == 'HIGH' else (5 if x == 'MEDIUM' else 0))
    score += df['address_verified'].apply(lambda x: 10 if x == 0 else 0)
    score += df['digital_risk_score'] * 0.15
    score += df['is_new_customer'] * 5
    score += df['txn_to_income_ratio'].apply(lambda x: 5 if x > 0.1 else 0)
    return score.clip(upper=100)

def generate_llm_explanations(df_flagged: pd.DataFrame) -> dict:
    """Batches flagged customers and asks Gemini to generate human-readable reasons."""
    if df_flagged.empty or not api_key:
        return {}
    
    records = df_flagged[['customer_id', 'risk_tier', 'top_risk_factors']].to_dict(orient='records')
    llm_reasons = {}
    
    # Process in batches of 50 to prevent LLM context overflow or missed outputs
    chunk_size = 50
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i+chunk_size]
        
        prompt = f"""
        You are an expert KYC (Know Your Customer) compliance officer. 
        I am providing a JSON list of flagged customers. It includes their risk tier and the raw machine learning features (SHAP) that drove their risk score.
        
        Translate these raw features into a short, professional, human-readable sentence explaining why they were flagged. 
        
        Data to process:
        {json.dumps(chunk, indent=2)}
        
        Return ONLY a valid JSON object mapping 'customer_id' to the 'human_reason'.
        Example format:
        {{
            "CUST_001": "Flagged as High Risk due to presence on a sanctions list and an unverified address.",
            "CUST_002": "Flagged for manual review due to high country risk and incomplete documents."
        }}
        """
        
        try:
            # Force Gemini to return structured JSON
            response = llm_model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            batch_result = json.loads(response.text)
            llm_reasons.update(batch_result)
        except Exception as e:
            print(f"LLM Batch Error: {e}")
            # Fallback to raw string if LLM fails
            for record in chunk:
                llm_reasons[record['customer_id']] = f"Flagged based on: {record['top_risk_factors']}"
                
    return llm_reasons

@app.get("/")
async def root():
    """
    Home route: Provides a basic welcome message and navigation.
    """
    return {
        "service": "Smart KYC Risk Scoring API",
        "status": "Online",
        "message": "hola."
    }

@app.get("/health")
async def health_check():
    """
    Health check route: Used by load balancers and deployment orchestrators 
    (like Kubernetes) to ensure the server is alive.
    """
    # In a more complex app, you might also check database connections here.
    # For now, a simple HTTP 200 OK response with 'healthy' is perfect.
    return {"status": "healthy"}

@app.post("/score")
async def score_kyc_data(file: UploadFile = File(...)):
    # 1. Read CSV
    contents = await file.read()
    df_raw = pd.read_csv(io.BytesIO(contents))
    
    # 2. Engineer & Transform
    df_clean = preprocess_and_engineer(df_raw)
    transformed_data = preprocessor.transform(df_clean)
    passthrough_data = df_clean[binary_flags].values 
    X_inference = np.hstack((transformed_data, passthrough_data))
    
    ohe_feature_names = preprocessor.named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(categorical_cols)
    all_feature_names = numerical_cols + list(ohe_feature_names) + binary_flags
    X_df = pd.DataFrame(X_inference, columns=all_feature_names)
    
    # 3. Predict & SHAP Extract
    predictions_encoded = rf_model.predict(X_df)
    reverse_mapping = {0: 'LOW', 1: 'MEDIUM', 2: 'HIGH'}
    predicted_tiers = [reverse_mapping[p] for p in predictions_encoded]
    
    shap_values = explainer.shap_values(X_df)
    is_list = isinstance(shap_values, list)
    
    top_risk_factors = []
    for i in range(len(X_df)):
        pred_class = predictions_encoded[i]
        if pred_class == 0:
            top_risk_factors.append("None")
        else:
            instance_shap = shap_values[pred_class][i] if is_list else shap_values[i, :, pred_class]
            top_indices = np.argsort(instance_shap)[-3:][::-1]
            factors = [all_feature_names[idx] for idx in top_indices if instance_shap[idx] > 0]
            top_risk_factors.append(", ".join(factors) if factors else "Complex feature interactions")

    # 4. Build Initial Output DataFrame
    final_output = pd.DataFrame({
        'customer_id': df_clean['customer_id'],
        'risk_score': calculate_heuristic_score(df_clean),
        'risk_tier': predicted_tiers,
        'decision': ['APPROVE' if t == 'LOW' else ('MANUAL_REVIEW' if t == 'MEDIUM' else 'REJECT / EDD') for t in predicted_tiers],
        'top_risk_factors': top_risk_factors
    })

    # 5. Get LLM Explanations for Flagged Customers
    flagged_df = final_output[final_output['risk_tier'] != 'LOW']
    llm_explanations = generate_llm_explanations(flagged_df)
    
    # Map the explanations back to the dataframe (Low risk gets auto-approved message)
    final_output['human_readable_reason'] = final_output['customer_id'].map(llm_explanations).fillna("Low risk profile. Auto-approved.")

    # 6. Return as JSON array
    return final_output.to_dict(orient="records")
