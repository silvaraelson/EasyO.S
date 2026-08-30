import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserRole } from "@easy-os/schemas";
import { api } from "../../lib/api";
import { ROLE_LABELS } from "../../lib/labels";

const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [UserRole, string][];

export function UsersPage() {
  const queryClient = useQueryClient();
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users", "all"],
    queryFn: () => api.users.list(),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  // --- novo usuário ---------------------------------------------------
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("attendant");
  const [team, setTeam] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      api.users.create({
        name,
        email,
        password,
        role,
        team: team || undefined,
        active: true,
      }),
    onSuccess: () => {
      invalidate();
      setName("");
      setEmail("");
      setPassword("");
      setRole("attendant");
      setTeam("");
    },
  });

  // --- edição inline ----------------------------------------------------
  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string; role?: UserRole; active?: boolean }) =>
      api.users.update(id, input),
    onSuccess: invalidate,
  });

  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password: pwd }: { id: string; password: string }) =>
      api.users.resetPassword(id, pwd),
    onSuccess: () => {
      setResetTarget(null);
      setNewPassword("");
    },
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate();
  }

  return (
    <section>
      <h1>Gestão de acessos</h1>
      <p className="muted">Usuários com acesso ao Easy OS — papéis controlam o que cada um pode fazer.</p>

      {isLoading && <p>Carregando…</p>}
      {error && <p className="form-error">{(error as Error).message}</p>}

      {users && (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Equipe</th>
              <th>Ativo</th>
              <th>Senha</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.active ? undefined : "row-alert"}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    disabled={updateMutation.isPending}
                    onChange={(event) =>
                      updateMutation.mutate({ id: u.id, role: event.target.value as UserRole })
                    }
                  >
                    {ROLE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{u.team ?? "—"}</td>
                <td>
                  <button
                    type="button"
                    className="button-secondary"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: u.id, active: !u.active })}
                  >
                    {u.active ? "Ativo" : "Inativo"}
                  </button>
                </td>
                <td>
                  {resetTarget === u.id ? (
                    <form
                      className="form-row"
                      onSubmit={(event: FormEvent) => {
                        event.preventDefault();
                        resetPasswordMutation.mutate({ id: u.id, password: newPassword });
                      }}
                    >
                      <input
                        className="short"
                        type="password"
                        placeholder="Nova senha"
                        minLength={8}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        required
                        autoFocus
                      />
                      <button type="submit" disabled={resetPasswordMutation.isPending}>
                        Salvar
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => {
                          setResetTarget(null);
                          setNewPassword("");
                        }}
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => setResetTarget(u.id)}
                    >
                      Redefinir senha
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {updateMutation.isError && (
        <p className="form-error">{(updateMutation.error as Error).message}</p>
      )}
      {resetPasswordMutation.isError && (
        <p className="form-error">{(resetPasswordMutation.error as Error).message}</p>
      )}

      <form className="card form" onSubmit={handleCreate}>
        <h2>Novo usuário</h2>
        <label>
          Nome
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Senha provisória
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <div className="form-row">
          <label>
            Papel
            <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              {ROLE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Equipe (opcional)
            <input value={team} onChange={(event) => setTeam(event.target.value)} />
          </label>
        </div>
        {createMutation.isError && (
          <p className="form-error">{(createMutation.error as Error).message}</p>
        )}
        <button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Criando…" : "Criar usuário"}
        </button>
      </form>
    </section>
  );
}
