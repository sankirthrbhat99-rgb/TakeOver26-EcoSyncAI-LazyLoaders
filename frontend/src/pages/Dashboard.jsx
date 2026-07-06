import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Package, AlertTriangle, ClipboardList, Leaf } from "lucide-react";
import AgentTerminal from "@/components/AgentTerminal";

function KpiCard({ label, value, sub, icon: Icon, tone = "green", testid }) {
    const toneMap = {
        green: "text-[#166534] bg-emerald-50 border-emerald-100",
        amber: "text-[#D97706] bg-amber-50 border-amber-100",
        slate: "text-slate-600 bg-slate-50 border-slate-100",
    };
    return (
        <div className="eco-card p-6" data-testid={testid}>
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{label}</div>
                    <div className="text-3xl font-semibold text-[#1E293B] mt-3" style={{ fontFamily: "Outfit" }}>{value}</div>
                    {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
                </div>
                <div className={`w-10 h-10 rounded-md border flex items-center justify-center ${toneMap[tone]}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        let alive = true;
        const fetch = async () => {
            const { data } = await api.get("/dashboard/stats");
            if (alive) setStats(data);
        };
        fetch();
        const t = setInterval(fetch, 4000);
        return () => { alive = false; clearInterval(t); };
    }, []);

    const series = (stats?.carbon_series || []).map((p, i) => ({
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard testid="kpi-total-items" label="Tracked items" value={stats?.total_items ?? "—"} sub="Active SKUs" icon={Package} tone="slate" />
                <KpiCard testid="kpi-low-stock" label="Low stock alerts" value={stats?.low_stock_count ?? "—"} sub="At or below safety threshold" icon={AlertTriangle} tone="amber" />
                <KpiCard testid="kpi-pending-rfqs" label="Pending RFQs" value={stats?.pending_rfqs ?? "—"} sub="Awaiting human approval" icon={ClipboardList} tone="slate" />
                <KpiCard testid="kpi-carbon-saved" label="Carbon saved" value={`${stats?.carbon_saved_kg ?? 0} kg`} sub={`${stats?.carbon_saved_tons ?? 0} tons vs. worst-in-class`} icon={Leaf} tone="green" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 eco-card p-6" data-testid="carbon-chart-card">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-[#1E293B]" style={{ fontFamily: "Outfit" }}>Cumulative CO₂ saved</h3>
                            <p className="text-xs text-slate-500 mt-1">Kilograms avoided by choosing lower-carbon suppliers over traditional worst-in-class alternatives.</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-semibold text-[#166534]" style={{ fontFamily: "Outfit" }}>{stats?.carbon_saved_kg ?? 0} kg</div>
                            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Lifetime</div>
                        </div>
                    </div>
                    <div className="h-64 relative">
                        {series.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 italic pointer-events-none z-10">
                                No approved orders yet. Approve a green RFQ to see savings compound.
                            </div>
                        )}
                        <ResponsiveContainer width="100%" height="100%">
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

                <div className="eco-card p-6" data-testid="dashboard-terminal-preview">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-[#1E293B]" style={{ fontFamily: "Outfit" }}>Live agent activity</h3>
                    </div>
                    <AgentTerminal height="h-64" />
                </div>
            </div>
        </div>
    );
}
