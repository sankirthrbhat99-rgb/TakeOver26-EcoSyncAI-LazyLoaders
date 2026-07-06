import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const AGENT_COLORS = {
    "Demand Forecaster": "text-sky-400",
    "Eco-Scout": "text-emerald-400",
    "Procurement Agent": "text-amber-400",
    "System": "text-slate-400",
};

const STATUS_STYLES = {
    thinking: "text-slate-400 italic",
    executing: "text-emerald-400 eco-pulse",
    completed: "text-slate-300",
};

function fmtTime(ts) {
    try {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour12: false });
    } catch {
        return ts;
    }
}

export default function AgentTerminal({ height = "h-80" }) {
    const [logs, setLogs] = useState([]);
    const [connected, setConnected] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        let alive = true;
        const fetchLogs = async () => {
            try {
                const { data } = await api.get("/agent-logs?limit=250");
                if (!alive) return;
                setLogs(data);
                setConnected(true);
            } catch {
                setConnected(false);
            }
        };
        fetchLogs();
        const t = setInterval(fetchLogs, 2000);
        return () => {
            alive = false;
            clearInterval(t);
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="eco-card-solid overflow-hidden" data-testid="live-agent-terminal">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-xs font-medium text-slate-500 ml-2 uppercase tracking-widest">Live Agent Terminal</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {connected ? "streaming · 2s polling" : "reconnecting"}
                </div>
            </div>
            <div
                ref={scrollRef}
                className={`terminal-scroll bg-[#0F172A] ${height} overflow-y-auto p-4 font-mono text-xs leading-relaxed`}
                data-testid="terminal-log-list"
            >
                {logs.length === 0 && (
                    <div className="text-slate-500 italic">Waiting for agent activity...</div>
                )}
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 py-1 border-b border-slate-800/40 last:border-0 eco-fade-in">
                        <span className="text-slate-500 shrink-0 w-16">{fmtTime(log.timestamp)}</span>
                        <span className={`shrink-0 w-40 ${AGENT_COLORS[log.agent_name] || "text-slate-300"}`}>
                            [{log.agent_name}]
                        </span>
                        <span className={`shrink-0 w-24 ${STATUS_STYLES[log.current_status] || ""}`}>
                            {log.current_status}
                        </span>
                        <span className="text-slate-300 flex-1 break-words">{log.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
