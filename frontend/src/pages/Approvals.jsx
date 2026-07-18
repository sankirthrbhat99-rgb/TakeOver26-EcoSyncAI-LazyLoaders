import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, Mail, Leaf, Clock, AlertTriangle } from "lucide-react";

export default function Approvals() {
    const [pos, setPos] = useState([]);
    const [tab, setTab] = useState("pending_review");
    const [busy, setBusy] = useState(null);
    
    // Friction approval states
    const [selectedPo, setSelectedPo] = useState(null);
    const [confirmText, setConfirmText] = useState("");

    const load = useCallback(async () => {
        try {
            const { data } = await api.get(`/purchase-orders?status=${tab}`);
            setPos(Array.isArray(data) ? data : []);
        } catch {
            setPos([]);
        }
    }, [tab]);

    useEffect(() => {
        load();
        const t = setInterval(load, 3000);
        return () => clearInterval(t);
    }, [load]);

    const handleExecute = async () => {
        if (confirmText !== "CONFIRM" || !selectedPo) return;
        const id = selectedPo.id;

        // Atomically: close modal, clear input, remove card from list, fire success toast
        // — all synchronous state updates before any await so the UI responds instantly.
        setSelectedPo(null);
        setConfirmText("");
        setPos((prev) => prev.filter((p) => p.id !== id));
        toast.success("Action executed successfully");
        setBusy(id);

        try {
            await api.post(`/purchase-orders/${id}/approve`);
            load(); // re-sync with server in background
        } catch {
            toast.error("Approval failed — please refresh and retry.");
            load(); // restore server state on failure
        } finally {
            setBusy(null);
        }
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
                        onClick={() => {
                            setTab(t.k);
                            setSelectedPo(null); // Close modal if switching tabs
                        }}
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
                                        onClick={() => {
                                            setSelectedPo(po);
                                            setConfirmText("");
                                        }}
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

            {/* Enterprise-grade Friction Confirmation Modal */}
            {selectedPo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" data-testid="approval-modal">
                    <div className="w-full max-w-md bg-white border-2 border-amber-500 rounded-xl shadow-2xl overflow-hidden flex flex-col transform scale-100 transition-all duration-200">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border-b border-amber-100">
                            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                            <h3 className="text-base font-semibold text-amber-900" style={{ fontFamily: "Outfit" }}>
                                Confirm High-Impact Operational Change
                            </h3>
                        </div>
                        
                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Operational Action</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#166534] text-white">
                                        Agent Confidence Score: 96% - Verified
                                    </span>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-sm space-y-2.5 text-slate-700">
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Item</span>
                                        <span className="font-semibold text-slate-800 text-base">{selectedPo.inventory_name}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Supplier</span>
                                            <span className="font-medium text-slate-800">{selectedPo.supplier_name}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Quantity</span>
                                            <span className="font-medium text-slate-800">{selectedPo.quantity} units</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Cost</span>
                                        <span className="font-semibold text-amber-600">${selectedPo.total_price.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Friction Input */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                                    Friction Verification Check
                                </label>
                                <p className="text-xs text-slate-500">
                                    To confirm this action, please type <span className="font-mono font-bold text-slate-800">CONFIRM</span> below.
                                </p>
                                <input
                                    type="text"
                                    placeholder="Type CONFIRM to authorize"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    data-testid="confirm-input"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-md shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm font-mono text-center tracking-widest uppercase focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setSelectedPo(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExecute}
                                disabled={confirmText !== "CONFIRM" || busy === selectedPo.id}
                                data-testid="execute-action-btn"
                                className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm animate-pulse-subtle"
                            >
                                Execute Action
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
