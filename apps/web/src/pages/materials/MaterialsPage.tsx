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

  const mutation = useMutation({
    mutationFn: api.materials.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setSku("");
      setDescription("");
      setCost("");
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
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => (
              <tr key={material.id}>
                <td>{material.sku}</td>
                <td>{material.description}</td>
                <td>{material.unit}</td>
                <td>{formatCurrency(material.cost)}</td>
                <td>{material.stockQuantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
        </div>
        {mutation.isError && <p className="form-error">{(mutation.error as Error).message}</p>}
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </section>
  );
}
