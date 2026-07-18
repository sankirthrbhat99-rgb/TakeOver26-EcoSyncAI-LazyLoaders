import React, { useState, useEffect, useRef } from "react";

const logs = [
    "[System]: Initializing EcoSync multi-agent terminal...",
    "[Demand Forecaster]: Low inventory threshold triggered for Raw Aluminum.",
    "[Eco-Supplier Scout]: Querying global green vendor database...",
    "[Eco-Supplier Scout]: Found 3 eco-certified vendors. Cross-referencing pricing.",
    "[Procurement Agent]: Drafting optimal RFQ for Vendor B.",
    "[Procurement Agent]: Queued purchase order for human approval."
];

export default function AgentExecutionLog() {
    const [visibleLogs, setVisibleLogs] = useState([]);
    const containerRef = useRef(null);

    useEffect(() => {
        let index = 0;
        // Show the first log immediately on load
        setVisibleLogs([logs[0]]);
        index = 1;

        const interval = setInterval(() => {
            setVisibleLogs((prev) => [...prev, logs[index % logs.length]]);
            index++;
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [visibleLogs]);

    return (
        <div className="flex flex-col bg-gray-900 text-green-400 font-mono rounded-lg shadow-2xl h-full border border-gray-800">
            {/* Terminal Header */}
            <div className="flex items-center justify-between bg-gray-950 px-4 py-3 border-b border-gray-800 select-none">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500 opacity-80" />
                    <span className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
                </div>
                <div className="text-gray-300 font-semibold text-xs tracking-wide">
                    [🤖 Live Multi-Agent Execution Log]
                </div>
                <div className="w-12" /> {/* spacer to balance dots */}
            </div>

            {/* Terminal Body */}
            <div 
                ref={containerRef} 
                className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent"
            >
                {/* Fix 5: stable composite keys — index alone causes React key-collision
                    warnings when the same log string re-appears as the array loops. */}
                {visibleLogs.map((log, idx) => {
                    const match = log.match(/^\[(.*?)\]:(.*)$/);
                    if (match) {
                        const agent = match[1];
                        const message = match[2];
                        let agentColor = "text-green-400";
                        if (agent === "System") agentColor = "text-gray-400";
                        else if (agent === "Demand Forecaster") agentColor = "text-amber-400 font-semibold";
                        else if (agent === "Eco-Supplier Scout") agentColor = "text-emerald-400 font-semibold";
                        else if (agent === "Procurement Agent") agentColor = "text-sky-400 font-semibold";

                        return (
                            <div key={`log-${idx}-${agent}`} className="flex items-start gap-1 leading-relaxed border-b border-gray-800/20 pb-2 last:border-0">
                                <span className="text-green-600 select-none">&gt;</span>
                                <div className="break-all">
                                    <span className={agentColor}>[{agent}]:</span>
                                    <span className="text-gray-200 ml-1.5">{message}</span>
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div key={`log-${idx}-raw`} className="flex items-start gap-1 leading-relaxed">
                            <span className="text-green-600 select-none">&gt;</span>
                            <span className="text-gray-200 break-all">{log}</span>
                        </div>
                    );
                })}
                {/* Blinking Cursor */}
                <div className="flex items-center gap-1 select-none">
                    <span className="text-green-600">&gt;</span>
                    <span className="w-2 h-4 bg-green-400 animate-pulse" />
                </div>
            </div>
        </div>
    );
}
