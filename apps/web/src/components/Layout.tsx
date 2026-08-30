import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { authClient } from "../lib/auth-client";
import { ROLE_LABELS } from "../lib/labels";
import type { SessionUser } from "../lib/session-user";

export function Layout() {
  const navigate = useNavigate();
  const { data } = authClient.useSession();
  const user = data?.user as SessionUser | undefined;

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="brand">Easy OS</span>
        <nav>
          <NavLink to="/indicadores">Indicadores</NavLink>
          <NavLink to="/clientes">Clientes</NavLink>
          <NavLink to="/ordens-de-servico">Ordens de Serviço</NavLink>
          <NavLink to="/agenda">Agenda</NavLink>
          {user?.role === "admin" && (
            <NavLink to="/tipos-de-servico">Tipos de Serviço</NavLink>
          )}
          {(user?.role === "admin" || user?.role === "manager") && (
            <NavLink to="/materiais">Materiais</NavLink>
          )}
          {user?.role === "admin" && (
            <NavLink to="/configuracoes">Configurações</NavLink>
          )}
        </nav>
        {user && (
          <div className="user-menu">
            <span>
              {user.name} · {ROLE_LABELS[user.role]}
            </span>
            <button type="button" onClick={handleSignOut}>
              Sair
            </button>
          </div>
        )}
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
