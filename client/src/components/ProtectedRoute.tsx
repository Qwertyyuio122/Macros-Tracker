import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../api/client";

export function ProtectedRoute() {
  const { loading } = useAuth();
  const token = api.getToken();

  if (loading && token) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#070709] text-zinc-400">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
