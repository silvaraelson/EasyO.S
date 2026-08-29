import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { SERVICE_ORDER_TRANSITIONS, type ServiceOrderStatus } from "@easy-os/schemas";
import { api } from "../../lib/api";
import { PRIORITY_LABELS, STATUS_LABELS } from "../../lib/labels";
import { FinanceSection } from "./FinanceSection";

export function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: serviceOrder, isLoading, error } = useQuery({
    queryKey: ["service-orders", id],
    queryFn: () => api.serviceOrders.get(id!),
    enabled: Boolean(id),
  });

  const { data: technicians } = useQuery({
    queryKey: ["users", "technician"],
    queryFn: () => api.users.list("technician"),
  });

  const [scheduledAt, setScheduledAt] = useState("");
  const [technicianId, setTechnicianId] = useState("");

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["service-orders", id] });
    queryClient.invalidateQueries({ queryKey: ["service-orders"] });
  }

  const statusMutation = useMutation({
    mutationFn: (status: ServiceOrderStatus) => api.serviceOrders.updateStatus(id!, status),
    onSuccess: invalidate,
  });

  const scheduleMutation = useMutation({
    mutationFn: () =>
      api.serviceOrders.schedule(
        id!,
        new Date(scheduledAt).toISOString(),
        technicianId || undefined,
      ),
    onSuccess: invalidate,
  });

  const allowedTransitions = useMemo(
    () => (serviceOrder ? SERVICE_ORDER_TRANSITIONS[serviceOrder.status] : []),
    [serviceOrder],
  );

  if (isLoading) return <p>Carregando…</p>;
  if (error) return <p className="form-error">{(error as Error).message}</p>;
  if (!serviceOrder) return null;

  return (
    <section>
      <div className="page-header">
        <h1>OS #{serviceOrder.number}</h1>
        <span className={`status-pill status-${serviceOrder.status}`}>
          {STATUS_LABELS[serviceOrder.status]}
        </span>
      </div>

      <div className="two-column">
        <div className="card">
          <h2>Detalhes</h2>
          <dl className="details-list">
            <dt>Prioridade</dt>
            <dd>{PRIORITY_LABELS[serviceOrder.priority]}</dd>
            <dt>Agendada para</dt>
            <dd>
              {serviceOrder.scheduledAt
                ? new Date(serviceOrder.scheduledAt).toLocaleString("pt-BR")
                : "Ainda não agendada"}
            </dd>
            {serviceOrder.description && (
              <>
                <dt>Descrição</dt>
                <dd>{serviceOrder.description}</dd>
              </>
            )}
          </dl>

          {allowedTransitions.includes("scheduled") && (
            <form
              className="form"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                scheduleMutation.mutate();
              }}
            >
              <h3>Agendar</h3>
              <label>
                Data e hora
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  required
                />
              </label>
              <label>
                Técnico
                <select
                  value={technicianId}
                  onChange={(event) => setTechnicianId(event.target.value)}
                >
                  <option value="">A definir</option>
                  {technicians?.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name}
                    </option>
                  ))}
                </select>
              </label>
              {scheduleMutation.isError && (
                <p className="form-error">{(scheduleMutation.error as Error).message}</p>
              )}
              <button type="submit" disabled={scheduleMutation.isPending}>
                {scheduleMutation.isPending ? "Agendando…" : "Agendar"}
              </button>
            </form>
          )}

          {allowedTransitions.filter((status) => status !== "scheduled").length > 0 && (
            <div className="status-actions">
              {allowedTransitions
                .filter((status) => status !== "scheduled")
                .map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={status === "canceled" ? "button-danger" : "button-secondary"}
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate(status)}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
            </div>
          )}
          {statusMutation.isError && (
            <p className="form-error">{(statusMutation.error as Error).message}</p>
          )}
        </div>

        <div className="card">
          <h2>Timeline</h2>
          <ul className="timeline">
            {serviceOrder.events.map((event) => (
              <li key={event.id}>
                <span className={`status-pill status-${event.status}`}>
                  {STATUS_LABELS[event.status]}
                </span>
                <span className="muted">{new Date(event.createdAt).toLocaleString("pt-BR")}</span>
                {event.note && <p>{event.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <FinanceSection serviceOrderId={id!} serviceOrder={serviceOrder} />
    </section>
  );
}
