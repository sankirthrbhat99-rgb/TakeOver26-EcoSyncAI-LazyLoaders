import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Suppliers from "@/pages/Suppliers";
import Approvals from "@/pages/Approvals";
import TerminalPage from "@/pages/TerminalPage";
import { Toaster } from "@/components/ui/sonner";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <AuthProvider>
                    <Toaster position="top-right" richColors />
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route element={<Layout />}>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/inventory" element={<Inventory />} />
                            <Route path="/suppliers" element={<Suppliers />} />
                            <Route path="/approvals" element={<Approvals />} />
                            <Route path="/terminal" element={<TerminalPage />} />
                        </Route>
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
        </div>
    );
}

export default App;
