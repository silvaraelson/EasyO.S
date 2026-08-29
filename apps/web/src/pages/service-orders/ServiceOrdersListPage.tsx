import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { ServiceOrderStatus } from "@easy-os/schemas";
import { api } from "../../lib/api";
import { PRIORITY_LABELS, STATUS_LABELS } from "../../lib/labels";

export function ServiceOrdersListPage() {
  const [status, setStatus] = useState<ServiceOrderStatus | "">("");

  const { data: serviceOrders, isLoading, error } = useQuery({
    queryKey: ["service-orders", status],
    queryFn: () => api.serviceOrders.list(status || undefined),
  });

  return (
    <section>
      <div className="page-header">
        <h1>Ordens de Serviço</h1>
        <Link className="button" to="/ordens-de-servico/nova">
          Nova OS
        </Link>
      </div>

      <label className="filter">
        Status
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as ServiceOrderStatus | "")}
        >
          <option value="">Todas</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {isLoading && <p>Carregando…</p>}
      {error && <p className="form-error">{(error as Error).message}</p>}
      {serviceOrders && serviceOrders.length === 0 && <p>Nenhuma OS encontrada.</p>}

      {serviceOrders && serviceOrders.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Status</th>
              <th>Prioridade</th>
              <th>Agendada para</th>
            </tr>
          </thead>
          <tbody>
            {serviceOrders.map((serviceOrder) => (
              <tr key={serviceOrder.id}>
                <td>
                  <Link to={`/ordens-de-servico/${serviceOrder.id}`}>#{serviceOrder.number}</Link>
                </td>
                <td>
                  <span className={`status-pill status-${serviceOrder.status}`}>
                    {STATUS_LABELS[serviceOrder.status]}
                  </span>
                </td>
                <td>{PRIORITY_LABELS[serviceOrder.priority]}</td>
                <td>
                  {serviceOrder.scheduledAt
                    ? new Date(serviceOrder.scheduledAt).toLocaleString("pt-BR")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
