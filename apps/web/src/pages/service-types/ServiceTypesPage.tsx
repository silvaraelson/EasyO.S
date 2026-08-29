import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Priority } from "@easy-os/schemas";
import { api } from "../../lib/api";
import { PRIORITY_LABELS } from "../../lib/labels";

export function ServiceTypesPage() {
  const queryClient = useQueryClient();
  const { data: serviceTypes, isLoading, error } = useQuery({
    queryKey: ["service-types"],
    queryFn: api.serviceTypes.list,
  });

  const [name, setName] = useState("");
  const [defaultPriority, setDefaultPriority] = useState<Priority>("medium");

  const mutation = useMutation({
    mutationFn: api.serviceTypes.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types"] });
      setName("");
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ name, defaultPriority, checklist: [] });
  }

  return (
    <section>
      <h1>Tipos de serviço</h1>
      <p className="muted">
        Cada tipo de serviço define a prioridade padrão (e o SLA que ela implica) usada ao abrir
        uma OS.
      </p>

      {isLoading && <p>Carregando…</p>}
      {error && <p className="form-error">{(error as Error).message}</p>}

      {serviceTypes && (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Prioridade padrão</th>
            </tr>
          </thead>
          <tbody>
            {serviceTypes.map((serviceType) => (
              <tr key={serviceType.id}>
                <td>{serviceType.name}</td>
                <td>{PRIORITY_LABELS[serviceType.defaultPriority]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form className="card form" onSubmit={handleSubmit}>
        <h2>Novo tipo de serviço</h2>
        <label>
          Nome
          <input
            placeholder="Ex.: Instalação, Manutenção, Reparo"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label>
          Prioridade padrão
          <select
            value={defaultPriority}
            onChange={(event) => setDefaultPriority(event.target.value as Priority)}
          >
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {mutation.isError && <p className="form-error">{(mutation.error as Error).message}</p>}
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </section>
  );
}
