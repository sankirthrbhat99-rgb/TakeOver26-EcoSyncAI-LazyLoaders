import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";

export default function Layout() {
    const { user } = useAuth();
    if (user === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] text-slate-500 text-sm" data-testid="app-loading">
                Loading control tower...
            </div>
        );
    }
    if (user === false) return <Navigate to="/login" replace />;
    return (
        <div className="min-h-screen flex bg-[#F8F9FA]">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}
