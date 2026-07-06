import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Zap, Minus } from "lucide-react";

export default function Inventory() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        const { data } = await api.get("/inventory");
        setItems(data);
        setLoading(false);
    };

    useEffect(() => {
        load();
        const t = setInterval(load, 3000);
        return () => clearInterval(t);
    }, []);

    const consume = async (id, qty = 30) => {
        try {
            const { data } = await api.post(`/inventory/${id}/consume?qty=${qty}`);
            toast.success(`Consumed ${qty} units. New stock: ${data.current_stock}${data.triggered_reorder ? " — reorder loop triggered" : ""}`);
            load();
        } catch {
            toast.error("Consumption failed");
        }
    };

    const trigger = async (id, name) => {
        try {
            await api.post(`/inventory/${id}/trigger-reorder`);
            toast.success(`Agent loop triggered for ${name}`);
        } catch {
            toast.error("Failed to trigger loop");
        }
    };

    return (
        <div className="p-8 md:p-10 max-w-[1400px] mx-auto space-y-6" data-testid="inventory-page">
            <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Warehouse</p>
                <h1 className="text-4xl font-semibold text-[#1E293B] mt-1" style={{ fontFamily: "Outfit" }}>Inventory</h1>
                <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                    Rows highlighted in amber are at or below their safety threshold and will auto-trigger the reorder loop.
                </p>
            </div>

            <div className="eco-card overflow-hidden" data-testid="inventory-table-card">
                <table className="w-full text-sm" data-testid="inventory-table">
                    <thead>
                        <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 font-semibold">
                            <th className="p-4">Item</th>
                            <th className="p-4">Component</th>
                            <th className="p-4">Stock</th>
                            <th className="p-4">Safety threshold</th>
                            <th className="p-4">Reorder qty</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td className="p-6 text-slate-500" colSpan={6}>Loading inventory...</td></tr>
                        )}
                        {!loading && items.length === 0 && (
                            <tr><td className="p-6 text-slate-500" colSpan={6}>No inventory items.</td></tr>
                        )}
                        {items.map((it) => {
                            const warn = it.current_stock <= it.safety_threshold;
                            return (
                                <tr
                                    key={it.id}
                                    data-testid={`inventory-row-${it.id}`}
                                    className={warn
                                        ? "bg-[#FEF3C7] border-b border-[#FDE68A] hover:bg-[#FDE68A]/70 transition-colors"
                                        : "border-b border-slate-100 hover:bg-slate-50 transition-colors"}
                                >
                                    <td className="p-4">
                                        <div className="font-medium text-[#1E293B]">{it.item_name}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{it.unit}</div>
                                    </td>
                                    <td className="p-4 text-slate-600">{it.component_type}</td>
                                    <td className="p-4">
                                        <span className={warn ? "text-[#D97706] font-semibold" : "text-[#1E293B] font-medium"}>
                                            {it.current_stock}
                                        </span>
                                        {warn && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]" data-testid={`status-badge-${it.id}`}>
                                                Low Stock Alert
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-slate-600">{it.safety_threshold}</td>
                                    <td className="p-4 text-slate-600">{it.reorder_quantity}</td>
                                    <td className="p-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => consume(it.id, 30)}
                                                data-testid={`consume-${it.id}`}
                                                className="inline-flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-[#1E293B] rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                                            >
                                                <Minus className="w-3.5 h-3.5" /> Consume 30
                                            </button>
                                            <button
                                                onClick={() => trigger(it.id, it.item_name)}
                                                data-testid={`trigger-${it.id}`}
                                                className="inline-flex items-center gap-1.5 bg-[#166534] hover:bg-[#14532D] text-white rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                                            >
                                                <Zap className="w-3.5 h-3.5" /> Trigger reorder
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
