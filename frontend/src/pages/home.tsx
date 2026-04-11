import React, { useState, useMemo } from "react";
import { Cpu, Upload, Settings, TrendingUp, AlertTriangle, Zap, Database, ChevronsUpDown, Eye, RefreshCw, Info, Loader2 } from "lucide-react";

// --- Types ---
type RiskTier = "LOW" | "MEDIUM" | "HIGH";
type Decision = "APPROVE" | "MANUAL_REVIEW" | "REJECT / EDD";

interface KYCResult {
    customer_id: string;
    risk_score: number;
    risk_tier: RiskTier;
    decision: Decision;
    top_risk_factors: string;
    human_readable_reason: string;
}

type SortConfig = {
    key: keyof KYCResult;
    direction: "asc" | "desc";
} | null;

// --- API Service ---
const uploadScoreCSV = async (file: File): Promise<KYCResult[]> => {
    // Get API URL from environment variables.
    const apiUrl = import.meta.env.VITE_API_URL;
    const endpoint = `${apiUrl}/score`;

    // Use FormData to send the file as a multipart/form-data request
    const formData = new FormData();
    formData.append("file", file); // Make sure 'file' matches the field name expected by your backend

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) throw new Error(`API Error: ${response.status} - ${response.statusText}`);

        const data: KYCResult[] = await response.json();
        return data;
    } catch (error) {
        console.error("Error uploading CSV to API:", error);
        throw error; // Re-throw so the UI can handle the loading state properly
    }
};

export default function RiskEngineApp() {
    const [data, setData] = useState<KYCResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Filtering & Sorting State
    const [tierFilter, setTierFilter] = useState<string>("ALL_MODES");
    const [statusFilter, setStatusFilter] = useState<string>("ANY_DECISION");
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);

    // Selection
    const [selectedEntity, setSelectedEntity] = useState<KYCResult | null>(null);

    // Derived Statistics
    const stats = useMemo(() => {
        if (data.length === 0) return { total: 0, highRisk: 0, avgScore: 0 };
        const highRisk = data.filter((d) => d.risk_tier === "HIGH").length;
        const avgScore = data.reduce((acc, curr) => acc + curr.risk_score, 0) / data.length;
        return { total: data.length, highRisk, avgScore: avgScore.toFixed(2) };
    }, [data]);

    // Handle File Upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            const results = await uploadScoreCSV(file);
            setData(results);
            setSelectedEntity(results[0] || null); // Select first by default for smooth UX
        } catch (error) {
            console.error("Failed to parse CSV", error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle Sort Toggle
    const requestSort = (key: keyof KYCResult) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    // Apply Filters & Sorting
    const processedData = useMemo(() => {
        let filtered = [...data];

        if (tierFilter !== "ALL_MODES") {
            filtered = filtered.filter((item) => item.risk_tier === tierFilter);
        }

        if (statusFilter !== "ANY_DECISION") {
            filtered = filtered.filter((item) => {
                if (statusFilter === "APPROVE") return item.decision === "APPROVE";
                if (statusFilter === "REVIEW") return item.decision === "MANUAL_REVIEW";
                if (statusFilter === "REJECT") return item.decision === "REJECT / EDD";
                return true;
            });
        }

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [data, tierFilter, statusFilter, sortConfig]);

    return (
        <div className="flex flex-col min-h-screen bg-background pb-16 md:pb-0">
            <main className="relative flex-1 flex flex-col min-w-0 bg-surface">
                {/* TopNavBar */}
                <header className="flex justify-between items-center w-full px-4 md:px-6 py-4 bg-surface-container-lowest font-headline uppercase tracking-widest text-xs border-b border-outline-variant/20 shadow-xl z-10 transition-all duration-300">
                    <div className="flex items-center gap-4 md:gap-10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-container flex items-center justify-center transition-transform hover:scale-105 duration-300">
                                <Cpu size={18} className="text-on-primary" />
                            </div>
                            <div className="text-lg md:text-xl font-bold text-primary tracking-tighter hidden sm:block">RISK_ENGINE_V1.0</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-6">
                        {/* File Upload Button */}
                        <label className="cursor-pointer bg-primary text-on-primary font-bold px-4 py-2 hover:bg-primary-container transition-all duration-300 flex items-center gap-2 text-[10px] tracking-widest uppercase hover:-translate-y-0.5 shadow-lg hover:shadow-primary/20">
                            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            <span className="hidden sm:inline">{isProcessing ? "PROCESSING..." : "IMPORT_CSV"}</span>
                            <span className="sm:hidden">{isProcessing ? "..." : "IMPORT"}</span>
                            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
                        </label>
                        <div className="hidden sm:block h-6 w-px bg-outline-variant/20"></div>
                        <button className="hidden sm:flex w-8 h-8 items-center justify-center text-primary/60 hover:text-primary transition-colors hover:rotate-90 duration-500">
                            <Settings size={20} />
                        </button>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-48 md:pb-52 space-y-8 max-w-[1600px] mx-auto w-full transition-all duration-500 ease-in-out">
                    {/* Statistics Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-outline-variant/10">
                        <div className="bg-surface-container-low p-6 border-l-2 border-primary-container hover:bg-surface-container-high transition-colors duration-300">
                            <div className="text-[10px] font-headline tracking-widest text-primary/40 uppercase mb-1">Total_Scanned</div>
                            <div className="text-3xl font-headline font-bold text-primary">{stats.total}</div>
                            <div className="text-[10px] text-primary-container mt-2 flex items-center gap-1 opacity-80">
                                <TrendingUp size={12} /> +14.2% FROM_PREV
                            </div>
                        </div>
                        <div className="bg-surface-container-low p-6 hover:bg-surface-container-high transition-colors duration-300">
                            <div className="text-[10px] font-headline tracking-widest text-primary/40 uppercase mb-1">High_Risk_Flags</div>
                            <div className="text-3xl font-headline font-bold text-error">{stats.highRisk}</div>
                            <div className="text-[10px] text-error mt-2 flex items-center gap-1 opacity-80">
                                <AlertTriangle size={12} /> CRITICAL_THRESHOLD
                            </div>
                        </div>
                        <div className="bg-surface-container-low p-6 hover:bg-surface-container-high transition-colors duration-300">
                            <div className="text-[10px] font-headline tracking-widest text-primary/40 uppercase mb-1">Avg_Risk_Score</div>
                            <div className="text-3xl font-headline font-bold text-primary">{stats.avgScore}</div>
                            <div className="w-full bg-surface-container-highest h-1 mt-4 overflow-hidden">
                                <div className="bg-primary-container h-full transition-all duration-1000 ease-out" style={{ width: `${parseFloat(stats.avgScore as string) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-surface-container-low p-6 hover:bg-surface-container-high transition-colors duration-300 hidden sm:block">
                            <div className="text-[10px] font-headline tracking-widest text-primary/40 uppercase mb-1">System_Load</div>
                            <div className="text-3xl font-headline font-bold text-secondary">0.08ms</div>
                            <div className="text-[10px] text-secondary mt-2 flex items-center gap-1 opacity-80">
                                <Zap size={12} /> OPTIMAL_PERFORMANCE
                            </div>
                        </div>
                    </div>

                    {/* Main Table Section */}
                    <div className="bg-surface-container-low border border-outline-variant/10 shadow-lg">
                        {/* Table Header / Filters */}
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-5 bg-surface-container-high gap-4 border-b border-outline-variant/10">
                            <div className="flex items-center gap-3">
                                <Database size={20} className="text-primary" />
                                <h2 className="font-headline font-bold text-sm tracking-widest uppercase">Entity_Risk_Log</h2>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                                <div className="flex-1 lg:flex-none flex items-center bg-surface-container-lowest px-4 py-2 gap-2 text-[10px] font-headline text-primary/60 border border-outline-variant/10 transition-colors focus-within:border-primary/50 hover:border-primary/30">
                                    <span className="tracking-widest">TIER:</span>
                                    <select
                                        value={tierFilter}
                                        onChange={(e) => setTierFilter(e.target.value)}
                                        className="bg-transparent border-none p-0 focus:ring-0 text-primary uppercase text-[10px] cursor-pointer font-bold outline-none w-full"
                                    >
                                        <option value="ALL_MODES">ALL_MODES</option>
                                        <option value="HIGH">HIGH</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="LOW">LOW</option>
                                    </select>
                                </div>
                                <div className="flex-1 lg:flex-none flex items-center bg-surface-container-lowest px-4 py-2 gap-2 text-[10px] font-headline text-primary/60 border border-outline-variant/10 transition-colors focus-within:border-primary/50 hover:border-primary/30">
                                    <span className="tracking-widest">STATUS:</span>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="bg-transparent border-none p-0 focus:ring-0 text-primary uppercase text-[10px] cursor-pointer font-bold outline-none w-full"
                                    >
                                        <option value="ANY_DECISION">ANY_DECISION</option>
                                        <option value="APPROVE">APPROVE</option>
                                        <option value="REVIEW">REVIEW</option>
                                        <option value="REJECT">REJECT</option>
                                    </select>
                                </div>
                                <button className="hidden lg:flex bg-surface-container-highest p-2 border border-outline-variant/20 hover:bg-primary-container hover:text-on-primary transition-all duration-300">
                                    <RefreshCw size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-surface-container-lowest border-b border-outline-variant/10 text-[10px] font-headline tracking-widest text-primary/40">
                                        <th className="px-6 py-4 font-medium uppercase">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors group" onClick={() => requestSort("customer_id")}>
                                                Customer_ID <ChevronsUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 font-medium uppercase">
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors group" onClick={() => requestSort("risk_score")}>
                                                Risk_Score <ChevronsUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 font-medium uppercase">Risk_Tier</th>
                                        <th className="px-6 py-4 font-medium uppercase">Decision</th>
                                        <th className="px-6 py-4 font-medium uppercase">Factors</th>
                                        <th className="px-6 py-4 font-medium uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs font-mono">
                                    {processedData.length > 0 ? (
                                        processedData.map((row) => (
                                            <tr
                                                key={row.customer_id}
                                                className={`border-b border-outline-variant/5 hover:bg-surface-container-highest transition-all duration-200 cursor-pointer group ${
                                                    selectedEntity?.customer_id === row.customer_id ? "bg-surface-container-highest border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
                                                }`}
                                                onClick={() => setSelectedEntity(row)}
                                            >
                                                <td className="px-6 py-5 text-primary font-bold group-hover:text-primary-fixed transition-colors">{row.customer_id}</td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold w-8 ${row.risk_score > 0.8 ? "text-error" : row.risk_score > 0.4 ? "text-tertiary-fixed-dim" : "text-secondary"}`}>
                                                            {row.risk_score}
                                                        </span>
                                                        <div className="w-24 bg-surface-container-highest h-1.5 overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all duration-700 ease-out ${
                                                                    row.risk_score > 0.8 ? "bg-error" : row.risk_score > 0.4 ? "bg-tertiary-fixed-dim" : "bg-secondary-container"
                                                                }`}
                                                                style={{ width: `${row.risk_score * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    {row.risk_tier === "HIGH" && (
                                                        <span className="bg-error-container text-on-error-container px-2.5 py-1 text-[9px] font-headline font-bold uppercase tracking-wider">
                                                            HIGH_RISK
                                                        </span>
                                                    )}
                                                    {row.risk_tier === "MEDIUM" && (
                                                        <span className="bg-tertiary-container text-on-tertiary-container px-2.5 py-1 text-[9px] font-headline font-bold uppercase tracking-wider">
                                                            MEDIUM_RISK
                                                        </span>
                                                    )}
                                                    {row.risk_tier === "LOW" && (
                                                        <span className="bg-secondary-container text-on-secondary-container px-2.5 py-1 text-[9px] font-headline font-bold uppercase tracking-wider">
                                                            LOW_RISK
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    {row.decision === "REJECT / EDD" && (
                                                        <span className="bg-[#93000a] text-white px-2.5 py-1 text-[9px] font-headline font-bold uppercase tracking-wider shadow-[0_0_8px_rgba(147,0,10,0.5)]">
                                                            REJECT
                                                        </span>
                                                    )}
                                                    {row.decision === "MANUAL_REVIEW" && (
                                                        <span className="bg-surface-container-highest text-primary-fixed-dim px-2.5 py-1 text-[9px] font-headline font-bold uppercase tracking-wider border border-primary-fixed-dim/30">
                                                            REVIEW
                                                        </span>
                                                    )}
                                                    {row.decision === "APPROVE" && (
                                                        <span className="bg-on-primary-container text-primary px-2.5 py-1 text-[9px] font-headline font-bold uppercase tracking-wider">APPROVE</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-primary/60">
                                                    <div className="flex flex-wrap gap-2">
                                                        {row.top_risk_factors.split(", ").map((factor) => (
                                                            <span
                                                                key={factor}
                                                                className="bg-surface-container-high px-1.5 py-0.5 border border-outline-variant/20 hover:border-primary/50 transition-colors"
                                                            >
                                                                {factor}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button className="text-primary/40 hover:text-primary-container transition-all hover:scale-110 duration-200">
                                                        <Eye size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-16 text-center text-primary/40 font-headline uppercase tracking-widest">
                                                {data.length === 0 ? "Awaiting CSV Import" : "No results match current filters"}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {data.length > 0 && (
                            <div className="flex justify-between items-center p-5 bg-surface-container-high text-[10px] font-headline border-t border-outline-variant/10">
                                <div className="text-primary/40 tracking-widest uppercase">
                                    SHOWING {processedData.length} OF {data.length} ENTITIES
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Expanded Detail View */}
                    {selectedEntity && (
                        <div className="fixed bottom-0 left-0 right-0 z-40 mx-auto w-full max-w-[1600px] px-4 md:px-8">
                            <div className="bg-surface-container-low p-6 md:p-8 border border-outline-variant/20 shadow-2xl overflow-hidden transition-all duration-500 ease-in-out opacity-100 translate-y-0">
                                <div
                                    className={`absolute top-0 right-0 w-32 h-32 rotate-45 translate-x-16 -translate-y-16 transition-colors duration-500 ${
                                        selectedEntity.risk_tier === "HIGH" ? "bg-error/5" : selectedEntity.risk_tier === "MEDIUM" ? "bg-tertiary-fixed-dim/5" : "bg-primary/5"
                                    }`}
                                ></div>
                                <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
                                    <div
                                        className={`w-12 h-12 flex items-center justify-center shrink-0 border transition-colors duration-500 ${
                                            selectedEntity.risk_tier === "HIGH"
                                                ? "bg-error-container/20 border-error/20"
                                                : selectedEntity.risk_tier === "MEDIUM"
                                                ? "bg-tertiary-container/20 border-tertiary-fixed-dim/20"
                                                : "bg-primary-container/20 border-primary/20"
                                        }`}
                                    >
                                        {selectedEntity.risk_tier === "HIGH" ? (
                                            <AlertTriangle size={24} className="text-error" />
                                        ) : (
                                            <Info size={24} className={selectedEntity.risk_tier === "MEDIUM" ? "text-tertiary-fixed-dim" : "text-primary"} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3
                                            className={`font-headline font-bold text-xs uppercase tracking-[0.2em] mb-4 transition-colors duration-500 ${
                                                selectedEntity.risk_tier === "HIGH" ? "text-error" : selectedEntity.risk_tier === "MEDIUM" ? "text-tertiary-fixed-dim" : "text-primary"
                                            }`}
                                        >
                                            SELECTED_ENTITY_REASONING: <span className="text-primary/80 ml-2">{selectedEntity.customer_id}</span>
                                        </h3>
                                        <p className="text-[12px] font-mono leading-relaxed text-primary/80 max-w-4xl border-l-2 border-outline-variant/20 pl-4 sm:pl-6 py-2">
                                            <span className="text-primary/50 block mb-2">ALGORITHM_EVALUATION:</span>
                                            {selectedEntity.human_readable_reason}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
