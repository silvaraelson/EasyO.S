import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { STATUS_LABELS, formatCurrency } from "../lib/labels";

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function formatHours(value: number | null) {
  if (value === null) return "—";
  if (value < 24) return `${value.toFixed(1)} h`;
  return `${(value / 24).toFixed(1)} dias`;
}

export function DashboardPage() {
  const [from, setFrom] = useState(() =>
    toDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
  );
  const [to, setTo] = useState(() => toDateInputValue(new Date()));

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", from, to],
    queryFn: () => api.dashboard.summary(from, to),
  });

  return (
    <section>
      <div className="page-header">
        <h1>Indicadores</h1>
      </div>

      <div className="form-row" style={{ maxWidth: 420, marginBottom: 24 }}>
        <label>
          De
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          Até
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </div>

      {isLoading && <p>Carregando…</p>}
      {error && <p className="form-error">{(error as Error).message}</p>}

      {data && (
        <>
          {data.lowStockMaterials.length > 0 && (
            <div className="card row-alert" style={{ marginBottom: 24 }}>
              <h2>Estoque baixo</h2>
              <ul className="plain-list">
                {data.lowStockMaterials.map((material) => (
                  <li key={material.id}>
                    <span className="badge-alert">{material.description}</span> — {material.stockQuantity}{" "}
                    em estoque (alerta em {material.lowStockThreshold})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="kpi-grid">
            <div className="kpi">
              <div className="label">OS no período</div>
              <div className="value">{data.totalOrders}</div>
            </div>
            <div className="kpi">
              <div className="label">SLA cumprido</div>
              <div className="value">{formatPercent(data.slaCompliance.rate)}</div>
              <div className="goal">{data.slaCompliance.met}/{data.slaCompliance.total} OS concluídas</div>
            </div>
            <div className="kpi">
              <div className="label">First-Time Fix Rate</div>
              <div className="value">{formatPercent(data.firstTimeFixRate)}</div>
              <div className="goal">meta de mercado: 85%+</div>
            </div>
            <div className="kpi">
              <div className="label">Tempo médio de atendimento</div>
              <div className="value">{formatHours(data.avgResolutionHours)}</div>
              <div className="goal">abertura → conclusão</div>
            </div>
            <div className="kpi">
              <div className="label">Ticket médio</div>
              <div className="value">{formatCurrency(data.ticketMedio)}</div>
            </div>
            <div className="kpi">
              <div className="label">Receita no período</div>
              <div className="value">{formatCurrency(data.totalRevenue)}</div>
              <div className="goal">{data.invoiceCount} fatura(s)</div>
            </div>
          </div>

          <div className="two-column" style={{ marginTop: 24 }}>
            <div className="card">
              <h2>OS por status</h2>
              <ul className="plain-list">
                {Object.entries(data.ordersByStatus).map(([status, count]) => (
                  <li key={status}>
                    <span className={`status-pill status-${status}`}>
                      {STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}
                    </span>{" "}
                    — {count}
                  </li>
                ))}
                {Object.keys(data.ordersByStatus).length === 0 && (
                  <li className="muted">Nenhuma OS nesse período.</li>
                )}
              </ul>
            </div>

            <div className="card">
              <h2>OS por tipo de serviço</h2>
              <ul className="plain-list">
                {data.ordersByServiceType.map((item) => (
                  <li key={item.serviceTypeId}>
                    {item.name} — {item.count}
                  </li>
                ))}
                {data.ordersByServiceType.length === 0 && (
                  <li className="muted">Nenhuma OS nesse período.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <h2>OS concluídas por técnico</h2>
            {data.ordersByTechnician.length === 0 && (
              <p className="muted">Nenhuma OS concluída nesse período.</p>
            )}
            {data.ordersByTechnician.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Técnico</th>
                    <th>OS concluídas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ordersByTechnician.map((item) => (
                    <tr key={item.technicianId}>
                      <td>{item.name}</td>
                      <td>{item.completedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </section>
  );
}
