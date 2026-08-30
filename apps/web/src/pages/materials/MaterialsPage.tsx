import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/labels";

export function MaterialsPage() {
  const queryClient = useQueryClient();
  const { data: materials, isLoading, error } = useQuery({
    queryKey: ["materials"],
    queryFn: api.materials.list,
  });

  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("un");
  const [cost, setCost] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");

  const [restockQuantities, setRestockQuantities] = useState<Record<string, string>>({});

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["materials"] });
  }

  const mutation = useMutation({
    mutationFn: api.materials.create,
    onSuccess: () => {
      invalidate();
      setSku("");
      setDescription("");
      setCost("");
      setLowStockThreshold("");
    },
  });

  const restockMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      api.materials.restock(id, quantity),
    onSuccess: (_data, variables) => {
      invalidate();
      setRestockQuantities((current) => ({ ...current, [variables.id]: "" }));
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({
      sku,
      description,
      unit,
      cost: Math.round(Number(cost.replace(",", ".")) * 100),
      stockQuantity: 0,
      lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : undefined,
    });
  }

  return (
    <section>
      <h1>Materiais</h1>
      <p className="muted">Catálogo de peças usadas nas OS — controla custo e estoque.</p>

      {isLoading && <p>Carregando…</p>}
      {error && <p className="form-error">{(error as Error).message}</p>}

      {materials && (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Descrição</th>
              <th>Unidade</th>
              <th>Custo</th>
              <th>Estoque</th>
              <th>Repor estoque</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => {
              const isLowStock =
                material.lowStockThreshold != null &&
                material.stockQuantity <= material.lowStockThreshold;
              return (
                <tr key={material.id} className={isLowStock ? "row-alert" : undefined}>
                  <td>{material.sku}</td>
                  <td>{material.description}</td>
                  <td>{material.unit}</td>
                  <td>{formatCurrency(material.cost)}</td>
                  <td>
                    {material.stockQuantity}
                    {isLowStock && <span className="badge-alert"> estoque baixo</span>}
                  </td>
                  <td>
                    <form
                      className="form-row"
                      onSubmit={(event: FormEvent) => {
                        event.preventDefault();
                        const quantity = Number(restockQuantities[material.id]);
                        if (quantity > 0) {
                          restockMutation.mutate({ id: material.id, quantity });
                        }
                      }}
                    >
                      <input
                        className="short"
                        type="number"
                        min={1}
                        placeholder="Qtd."
                        value={restockQuantities[material.id] ?? ""}
                        onChange={(event) =>
                          setRestockQuantities((current) => ({
                            ...current,
                            [material.id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="submit"
                        className="button-secondary"
                        disabled={restockMutation.isPending}
                      >
                        Adicionar
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {restockMutation.isError && (
        <p className="form-error">{(restockMutation.error as Error).message}</p>
      )}

      <form className="card form" onSubmit={handleSubmit}>
        <h2>Novo material</h2>
        <label>
          SKU
          <input value={sku} onChange={(event) => setSku(event.target.value)} required />
        </label>
        <label>
          Descrição
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
        </label>
        <div className="form-row">
          <label className="short">
            Unidade
            <input value={unit} onChange={(event) => setUnit(event.target.value)} required />
          </label>
          <label>
            Custo unitário (R$)
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              required
            />
          </label>
          <label className="short">
            Alerta de estoque baixo (opcional)
            <input
              type="number"
              min={0}
              placeholder="ex.: 5"
              value={lowStockThreshold}
              onChange={(event) => setLowStockThreshold(event.target.value)}
            />
          </label>
        </div>
        {mutation.isError && <p className="form-error">{(mutation.error as Error).message}</p>}
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </section>
  );
}
