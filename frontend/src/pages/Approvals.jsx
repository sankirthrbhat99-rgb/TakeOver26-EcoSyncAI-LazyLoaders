import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, Mail, Leaf, Clock } from "lucide-react";

export default function Approvals() {
    const [pos, setPos] = useState([]);
    const [tab, setTab] = useState("pending_review");
    const [busy, setBusy] = useState(null);

    const load = async () => {
        const { data } = await api.get(`/purchase-orders?status=${tab}`);
        setPos(data);
    };

    useEffect(() => {
        load();
        const t = setInterval(load, 3000);
        return () => clearInterval(t);
    }, [tab]);

    const approve = async (id) => {
        setBusy(id);
        // Optimistic UI: remove from pending list immediately
        setPos((prev) => prev.filter((p) => p.id !== id));
        try {
            await api.post(`/purchase-orders/${id}/approve`);
            toast.success("Purchase order approved — RFQ dispatched.");
            load();
        } catch {
            toast.error("Approval failed.");
            load();
        }
        setBusy(null);
    };

    return (
        <div className="p-8 md:p-10 max-w-[1400px] mx-auto space-y-6" data-testid="approvals-page">
            <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Human-in-the-loop</p>
                <h1 className="text-4xl font-semibold text-[#1E293B] mt-1" style={{ fontFamily: "Outfit" }}>Purchase order approvals</h1>
                <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                    Review each Procurement Agent draft. On approval, the RFQ is dispatched and inventory is topped up by the reorder quantity.
                </p>
            </div>

            <div className="flex gap-2" data-testid="approvals-tabs">
                {[
                    { k: "pending_review", label: "Pending" },
                    { k: "approved", label: "Approved" },
                ].map((t) => (
                    <button
                        key={t.k}
                        onClick={() => setTab(t.k)}
                        data-testid={`tab-${t.k}`}
                        className={`text-xs px-4 py-2 rounded-md border transition-colors ${
                            tab === t.k
                                ? "bg-[#1E293B] text-white border-[#1E293B]"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6" data-testid="approvals-list">
                {pos.length === 0 && (
                    <div className="bg-white border border-dashed border-slate-200 rounded-lg p-10 text-center text-slate-500 text-sm">
                        {tab === "pending_review" ? "No pending RFQs. Trigger a reorder on the Inventory page." : "No approved orders yet."}
                    </div>
                )}

                {pos.map((po) => (
                    <div key={po.id} className="eco-card overflow-hidden" data-testid={`po-card-${po.id}`}>
                        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-[#1E293B]" style={{ fontFamily: "Outfit" }}>{po.inventory_name}</h3>
                                    <span className="text-xs text-slate-500 font-mono">#{po.id.slice(0, 8)}</span>
                                </div>
                                <div className="text-sm text-slate-500">
                                    Selected supplier: <span className="font-medium text-[#1E293B]">{po.supplier_name}</span>
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {po.supplier_email}</div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Metric label="Quantity" value={`${po.quantity}`} />
                                <Metric label="Unit price" value={`$${po.unit_price.toFixed(2)}`} />
                                <Metric label="Total" value={`$${po.total_price.toLocaleString()}`} />
                                <Metric label="Carbon score" value={`${po.carbon_score}/100`} accent="green" />
                                <Metric label="Lead time" value={`${po.lead_time_days}d`} icon={Clock} />
                                <Metric label="CO₂ saved" value={`${po.carbon_saved_kg} kg`} icon={Leaf} accent="green" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3">
                            <div className="lg:col-span-2 p-6 border-b lg:border-b-0 lg:border-r border-slate-100">
                                <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">Drafted RFQ email</div>
                                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono leading-relaxed bg-slate-50 border border-slate-100 rounded-md p-4" data-testid={`rfq-body-${po.id}`}>
{po.rfq_email_body}
                                </pre>
                            </div>
                            <div className="p-6 flex flex-col justify-between gap-4">
                                <div className="text-sm text-slate-500">
                                    Drafted <span className="text-[#1E293B] font-medium">{new Date(po.created_at).toLocaleString()}</span>
                                </div>
                                {po.status === "pending_review" ? (
                                    <button
                                        onClick={() => approve(po.id)}
                                        disabled={busy === po.id}
                                        data-testid={`approve-order-btn-${po.id}`}
                                        className="inline-flex items-center justify-center gap-2 bg-[#166534] hover:bg-[#14532D] text-white rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        {busy === po.id ? "Approving..." : "Approve order"}
                                    </button>
                                ) : (
                                    <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-md px-3 py-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4" /> Approved · {po.approved_at ? new Date(po.approved_at).toLocaleString() : ""}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Metric({ label, value, icon: Icon, accent }) {
    return (
        <div className="min-w-[110px]">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</div>
            <div className={`text-base font-semibold mt-0.5 flex items-center gap-1.5 ${accent === "green" ? "text-[#166534]" : "text-[#1E293B]"}`} style={{ fontFamily: "Outfit" }}>
                {Icon && <Icon className="w-4 h-4" />} {value}
            </div>
        </div>
    );
}
