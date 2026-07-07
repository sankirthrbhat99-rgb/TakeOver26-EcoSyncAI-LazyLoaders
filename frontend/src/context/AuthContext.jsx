import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // null=loading, false=logged out, {}=logged in
    const [error, setError] = useState("");

    const checkSession = useCallback(async () => {
        try {
            const { data } = await api.get("/auth/me");
            setUser(data);
        } catch (error) {
            // Silently catch 401 Unauthorized errors (expected when not logged in)
            if (error.response && error.response.status === 401) {
                // Do nothing, just let it fail quietly
            } else {
                // Only log actual unexpected errors
                console.error("Session check failed:", error);
            }
            setUser(false);
        }
    }, []);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const login = async (email, password) => {
        setError("");
        try {
            const { data } = await api.post("/auth/login", { email, password });
            setUser(data);
            return true;
        } catch (e) {
            setError(formatApiErrorDetail(e?.response?.data?.detail) || "Login failed");
            return false;
        }
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch (e) {
            // ignore
        }
        setUser(false);
    };

    return (
        <AuthContext.Provider value={{ user, error, login, logout, checkSession }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
