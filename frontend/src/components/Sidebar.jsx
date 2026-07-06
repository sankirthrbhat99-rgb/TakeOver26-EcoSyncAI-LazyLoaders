import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
    LayoutDashboard, Package, Truck, Terminal, ClipboardCheck, LogOut, Leaf,
} from "lucide-react";

const nav = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
    { to: "/inventory", label: "Inventory", icon: Package, testid: "nav-inventory" },
    { to: "/suppliers", label: "Suppliers", icon: Truck, testid: "nav-suppliers" },
    { to: "/approvals", label: "Approvals", icon: ClipboardCheck, testid: "nav-approvals" },
    { to: "/terminal", label: "Agent Terminal", icon: Terminal, testid: "nav-terminal" },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login", { replace: true });
    };

    return (
        <aside className="w-64 shrink-0 flex flex-col bg-[#09090B] text-[#E4E4E7] border-r border-white/5" data-testid="app-sidebar">
            <div className="px-6 py-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-[#166534] text-white flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(22,101,52,0.5)]">
                        <Leaf className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[15px] font-semibold text-white" style={{ fontFamily: "Outfit" }}>EcoSync AI</div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-[#E4E4E7]/60">Control Tower</div>
                    </div>
                </div>
            </div>

            <nav className="flex-1 py-4">
                {nav.map((n) => (
                    <NavLink
                        key={n.to}
                        to={n.to}
                        end={n.to === "/"}
                        data-testid={n.testid}
                        className={({ isActive }) =>
                            [
                                "flex items-center gap-3 px-6 py-2.5 text-sm border-l-4 transition-colors",
                                isActive
                                    ? "border-emerald-500 bg-white/5 text-white font-medium"
                                    : "border-transparent text-slate-300 hover:bg-white/[0.04] hover:text-white",
                            ].join(" ")
                        }
                    >
                        <n.icon className="w-4 h-4" />
                        {n.label}
                    </NavLink>
                ))}
            </nav>

            <div className="border-t border-white/5 p-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-medium">
                        {(user?.name || user?.email || "A").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate" data-testid="sidebar-user-name">{user?.name || "Admin"}</div>
                        <div className="text-xs text-[#E4E4E7]/70 truncate">{user?.email}</div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    data-testid="logout-btn"
                    className="w-full inline-flex items-center gap-2 justify-center border border-white/10 text-[#E4E4E7] hover:bg-white/[0.04] hover:text-white rounded-md text-sm py-2 transition-colors"
                >
                    <LogOut className="w-4 h-4" /> Log out
                </button>
            </div>
        </aside>
    );
}
