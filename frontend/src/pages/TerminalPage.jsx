import AgentTerminal from "@/components/AgentTerminal";

export default function TerminalPage() {
    return (
        <div className="p-8 md:p-10 max-w-[1400px] mx-auto space-y-6" data-testid="terminal-page">
            <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Agent transparency</p>
                <h1 className="text-4xl font-semibold text-[#1E293B] mt-1" style={{ fontFamily: "Outfit" }}>Live agent terminal</h1>
                <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                    Every thought, decision, and action from the Demand Forecaster, Eco-Scout, and Procurement Agent — streamed here in real time.
                </p>
            </div>
            <AgentTerminal height="h-[65vh]" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <LegendCard color="text-sky-500" name="Demand Forecaster" desc="Detects stock deficits and quantifies reorder demand." />
                <LegendCard color="text-emerald-500" name="Eco-Scout" desc="Scores suppliers on balanced cost + low carbon footprint." />
                <LegendCard color="text-amber-500" name="Procurement Agent" desc="Drafts and dispatches RFQ emails after human approval." />
            </div>
        </div>
    );
}

function LegendCard({ color, name, desc }) {
    return (
        <div className="eco-card p-5">
            <div className={`text-xs uppercase tracking-widest font-semibold ${color}`}>{name}</div>
            <div className="text-sm text-slate-600 mt-2">{desc}</div>
        </div>
    );
}
