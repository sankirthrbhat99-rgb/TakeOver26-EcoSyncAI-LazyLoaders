import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function carbonBadge(score) {
    if (score <= 33) return { label: `${score} · Low`, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (score <= 66) return { label: `${score} · Medium`, cls: "bg-yellow-50 text-yellow-700 border-yellow-200" };
    return { label: `${score} · High`, cls: "bg-red-50 text-red-700 border-red-200" };
}

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState([]);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get("/suppliers");
                setSuppliers(Array.isArray(data) ? data : []);
            } catch {
                setSuppliers([]);
            }
        };
        load();
    }, []);

    const componentTypes = ["all", ...Array.from(new Set(suppliers.map((s) => s.component_type)))];
    const visible = filter === "all" ? suppliers : suppliers.filter((s) => s.component_type === filter);

    return (
        <div className="p-8 md:p-10 max-w-[1400px] mx-auto space-y-6" data-testid="suppliers-page">
            <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Supplier network</p>
                <h1 className="text-4xl font-semibold text-[#1E293B] mt-1" style={{ fontFamily: "Outfit" }}>Suppliers</h1>
                <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                    The Eco-Scout ranks these by a balanced blend of unit cost and carbon score (lower is better).
                </p>
            </div>

            <div className="flex flex-wrap gap-2" data-testid="suppliers-filter-bar">
                {componentTypes.map((t) => (
                    <button
                        key={t}
                        onClick={() => setFilter(t)}
                        data-testid={`filter-${t}`}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                            filter === t
                                ? "bg-[#1E293B] text-white border-[#1E293B]"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                        {t === "all" ? "All components" : t}
                    </button>
                ))}
            </div>

            <div className="eco-card overflow-hidden">
                <table className="w-full text-sm" data-testid="suppliers-table">
                    <thead>
                        <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 font-semibold">
                            <th className="p-4">Supplier</th>
                            <th className="p-4">Component</th>
                            <th className="p-4">Price / unit</th>
                            <th className="p-4">Carbon score</th>
                            <th className="p-4">Lead time</th>
                            <th className="p-4">Contact</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((s) => {
                            const b = carbonBadge(s.carbon_score);
                            return (
                                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors" data-testid={`supplier-row-${s.id}`}>
                                    <td className="p-4 font-medium text-[#1E293B]">{s.name}</td>
                                    <td className="p-4 text-slate-600">{s.component_type}</td>
                                    <td className="p-4 text-slate-700">${s.price_per_unit.toFixed(2)}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${b.cls}`}>
                                            {b.label}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600">{s.lead_time_days} d</td>
                                    <td className="p-4 text-slate-500 font-mono text-xs">{s.contact_email}</td>
                                </tr>
                            );
                        })}
                        {visible.length === 0 && (
                            <tr><td colSpan={6} className="p-6 text-slate-500">No suppliers.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
