export interface KycScoreRecord {
  customer_id: string;
  risk_score: number;
  risk_tier: 'LOW' | 'MEDIUM' | 'HIGH';
  decision: 'APPROVE' | 'MANUAL_REVIEW' | 'REJECT / EDD' | string;
  top_risk_factors: string;
  human_readable_reason?: string;
}
