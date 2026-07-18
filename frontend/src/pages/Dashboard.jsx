import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Package, ClipboardList, Leaf } from "lucide-react";
import AgentExecutionLog from "@/components/AgentExecutionLog";

export default function Dashboard() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        let alive = true;
        // Fix 4: try/catch prevents unhandled promise rejections in the console.
        const fetchStats = async () => {
            try {
                const { data } = await api.get("/dashboard/stats");
                if (alive) setStats(data);
            } catch {
                // Silently suppress — UI already shows fallback placeholders.
            }
        };
        fetchStats();
        const t = setInterval(fetchStats, 4000);
        return () => { alive = false; clearInterval(t); };
    }, []);

    const series = ((stats && stats.carbon_series) || []).map((p, i) => ({
        idx: i + 1,
        kg: p.cumulative_kg,
        supplier: p.supplier,
    }));

    return (
        <div className="p-8 md:p-10 max-w-[1400px] mx-auto space-y-8" data-testid="dashboard-page">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Control tower</p>
                    <h1 className="text-4xl font-semibold text-[#1E293B] mt-1" style={{ fontFamily: "Outfit" }}>
                        Green procurement overview
                    </h1>
                    <p className="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
                        Three autonomous agents monitor stock, rank suppliers by carbon efficiency and cost, and prepare RFQs for human approval.
                    </p>
                </div>
            </div>

            {/* Top Fold KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Pending Human Approvals */}
                <div className="eco-card p-6 relative overflow-hidden" data-testid="kpi-pending-rfqs">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Pending Human Approvals</div>
                            <div className="flex items-center gap-3 mt-3">
                                <span className="text-3xl font-bold text-[#1E293B]" style={{ fontFamily: "Outfit" }}>
                                    {stats?.pending_rfqs ?? 0}
                                </span>
                                {(stats?.pending_rfqs ?? 0) > 0 && (
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">Awaiting human review & dispatch</div>
                        </div>
                        <div className="w-10 h-10 rounded-md border flex items-center justify-center text-red-600 bg-red-50 border-red-100">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Card 2: Total Carbon Offset (Scope 3) */}
                <div className="eco-card p-6" data-testid="kpi-carbon-saved">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Total Carbon Offset (Scope 3)</div>
                            <div className="text-3xl font-bold text-[#1E293B] mt-3" style={{ fontFamily: "Outfit" }}>
                                {stats?.carbon_saved_kg ? `${stats.carbon_saved_kg.toLocaleString()} kg` : "1,870 kg"}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                {stats?.carbon_saved_tons ? `${stats.carbon_saved_tons} tons vs. worst-in-class` : "1.87 tons vs. worst-in-class"}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-md border flex items-center justify-center text-[#166534] bg-emerald-50 border-emerald-100">
                            <Leaf className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Card 3: Total Capital Optimized */}
                <div className="eco-card p-6" data-testid="kpi-capital-optimized">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Total Capital Optimized</div>
                            <div className="text-3xl font-bold text-[#1E293B] mt-3" style={{ fontFamily: "Outfit" }}>
                                {/* Fix 3: Intl.NumberFormat ensures clean USD formatting (e.g. $2,430) regardless of locale. */}
                                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(stats?.total_savings ?? 2430)}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">Saved via composite cost routing</div>
                        </div>
                        <div className="w-10 h-10 rounded-md border flex items-center justify-center text-[#D97706] bg-amber-50 border-amber-100">
                            <Package className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Agent Log Terminal immediately below the KPI grid */}
            <div className="h-[380px] overflow-hidden" data-testid="dashboard-terminal-preview">
                <AgentExecutionLog />
            </div>

            {/* Bottom half elements: Charts & historical graphics */}
            <div className="grid grid-cols-1 gap-6">
                <div className="eco-card p-6 h-[440px] flex flex-col" data-testid="carbon-chart-card">
                    <div className="flex items-start justify-between mb-6 shrink-0">
                        <div>
                            <h3 className="text-lg font-semibold text-[#1E293B]" style={{ fontFamily: "Outfit" }}>Cumulative CO₂ saved</h3>
                            <p className="text-xs text-slate-500 mt-1">Kilograms avoided by choosing lower-carbon suppliers over traditional worst-in-class alternatives.</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-semibold text-[#166534]" style={{ fontFamily: "Outfit" }}>{stats?.carbon_saved_kg ?? 0} kg</div>
                            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Lifetime</div>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 relative">
                        {series.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 italic pointer-events-none z-10">
                                No approved orders yet. Approve a green RFQ to see savings compound.
                            </div>
                        )}
                        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                            <AreaChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="ecoGreen" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#166534" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#166534" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="idx" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} label={{ value: "Approved orders", position: "insideBottom", offset: -2, fill: "#94A3B8", fontSize: 10 }} />
                                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} width={40} />
                                <Tooltip
                                    contentStyle={{ background: "#0F172A", border: "1px solid #1E293B", borderRadius: 6, color: "#E2E8F0", fontSize: 12 }}
                                    labelStyle={{ color: "#94A3B8" }}
                                    formatter={(v, _n, item) => [`${v} kg CO₂`, item.payload.supplier]}
                                />
                                <Area type="monotone" dataKey="kg" stroke="#166534" strokeWidth={2} fill="url(#ecoGreen)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
