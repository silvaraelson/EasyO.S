import { Navigate, Outlet } from "react-router-dom";
import { authClient } from "../lib/auth-client";

export function ProtectedRoute() {
  const { data, isPending } = authClient.useSession();

  if (isPending) return <p>Carregando…</p>;
  if (!data) return <Navigate to="/login" replace />;

  return <Outlet />;
}
