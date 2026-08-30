import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, type AgendaItem } from "../../lib/api";
import { PRIORITY_LABELS, STATUS_LABELS } from "../../lib/labels";

const RANGE_OPTIONS = [
  { label: "Próximos 7 dias", days: 7 },
  { label: "Próximos 14 dias", days: 14 },
  { label: "Próximos 30 dias", days: 30 },
];

function groupByDay(items: AgendaItem[]) {
  const groups = new Map<string, AgendaItem[]>();
  for (const item of items) {
    if (!item.scheduledAt) continue;
    const key = new Date(item.scheduledAt).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return groups;
}

export function AgendaPage() {
  const [days, setDays] = useState(7);

  const { from, to } = useMemo(() => {
    const now = new Date();
    return { from: now.toISOString(), to: new Date(now.getTime() + days * 86400000).toISOString() };
  }, [days]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["agenda", from, to],
    queryFn: () => api.serviceOrders.agenda(from, to),
  });

  const groups = useMemo(() => groupByDay(data ?? []), [data]);

  return (
    <section>
      <div className="page-header">
        <h1>Agenda</h1>
        <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
          {RANGE_OPTIONS.map((option) => (
            <option key={option.days} value={option.days}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p>Carregando…</p>}
      {error && <p className="form-error">{(error as Error).message}</p>}

      {data && data.length === 0 && (
        <p className="muted">Nenhuma OS agendada nesse período.</p>
      )}

      {Array.from(groups.entries()).map(([day, items]) => (
        <div className="agenda-day" key={day}>
          <h3>{day}</h3>
          {items.map((item) => (
            <Link className="agenda-item" to={`/ordens-de-servico/${item.id}`} key={item.id}>
              <span className="time">
                {item.scheduledAt
                  ? new Date(item.scheduledAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
              <span className={`status-pill status-${item.status}`}>
                {STATUS_LABELS[item.status]}
              </span>
              <span>
                OS #{item.number} — {item.customerName ?? "Cliente"}
              </span>
              <span className="muted">
                {PRIORITY_LABELS[item.priority]} · {item.technicianName ?? "Sem técnico"}
              </span>
            </Link>
          ))}
        </div>
      ))}
    </section>
  );
}
