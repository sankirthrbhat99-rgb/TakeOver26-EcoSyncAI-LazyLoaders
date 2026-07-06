import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf } from "lucide-react";

export default function Login() {
    const { user, login, error } = useAuth();
    const [email, setEmail] = useState("admin@ecosync.ai");
    const [password, setPassword] = useState("EcoSync2026!");
    const [submitting, setSubmitting] = useState(false);

    if (user && user !== false) return <Navigate to="/" replace />;

    const onSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await login(email, password);
        setSubmitting(false);
    };

    return (
        <div className="min-h-screen flex" data-testid="login-page">
            <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#166534] text-white p-12 relative overflow-hidden">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-white/15 flex items-center justify-center">
                        <Leaf className="w-6 h-6" />
                    </div>
                    <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: "Outfit" }}>EcoSync AI</span>
                </div>
                <div className="max-w-md space-y-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">Autonomous supply chain</p>
                    <h1 className="text-4xl lg:text-5xl font-semibold leading-tight" style={{ fontFamily: "Outfit" }}>
                        Procure smarter.<br />Ship greener.
                    </h1>
                    <p className="text-emerald-50/90 text-base leading-relaxed">
                        Three autonomous agents watch your inventory, rank suppliers by cost and carbon score, and draft RFQ emails — you just approve.
                    </p>
                </div>
                <div className="text-xs text-emerald-100/70 border-t border-white/10 pt-4">
                    Manufacturing SME control tower · v1.0
                </div>
                <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#14532D] opacity-40 blur-3xl" />
            </div>

            <div className="flex-1 flex items-center justify-center p-8 bg-[#F8F9FA]">
                <form onSubmit={onSubmit} className="w-full max-w-md eco-card-solid p-8 space-y-6" data-testid="login-form">
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Sign in</p>
                        <h2 className="text-2xl font-semibold text-[#1E293B]" style={{ fontFamily: "Outfit" }}>Welcome back to EcoSync</h2>
                        <p className="text-sm text-slate-500">Administrative dashboard for the multi-agent procurement engine.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                data-testid="login-email-input"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                data-testid="login-password-input"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-[#D97706] bg-[#FEF3C7] border border-[#FDE68A] px-3 py-2 rounded-md" data-testid="login-error">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={submitting}
                        data-testid="login-submit-btn"
                        className="w-full bg-[#166534] hover:bg-[#14532D] text-white"
                    >
                        {submitting ? "Signing in..." : "Sign in to dashboard"}
                    </Button>

                    <div className="text-xs text-slate-500 border-t border-slate-100 pt-4">
                        Demo credentials preloaded. Deep forest palette · Human-designed aesthetic.
                    </div>
                </form>
            </div>
        </div>
    );
}
