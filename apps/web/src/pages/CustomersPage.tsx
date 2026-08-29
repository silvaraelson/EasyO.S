import { useEffect, useState } from "react";
import type { Customer } from "@easy-os/schemas";
import { apiFetch } from "../lib/api";

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Customer[]>("/api/customers")
      .then(setCustomers)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Carregando clientes…</p>;
  if (error) return <p>Não foi possível carregar os clientes: {error}</p>;

  if (customers.length === 0) {
    return <p>Nenhum cliente cadastrado ainda.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Documento</th>
          <th>Tipo</th>
        </tr>
      </thead>
      <tbody>
        {customers.map((customer) => (
          <tr key={customer.id}>
            <td>{customer.name}</td>
            <td>{customer.document}</td>
            <td>{customer.kind === "individual" ? "Pessoa física" : "Pessoa jurídica"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
