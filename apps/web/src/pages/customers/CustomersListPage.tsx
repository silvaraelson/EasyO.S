import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

export function CustomersListPage() {
  const { data: customers, isLoading, error } = useQuery({
    queryKey: ["customers"],
    queryFn: api.customers.list,
  });

  return (
    <section>
      <div className="page-header">
        <h1>Clientes</h1>
        <Link className="button" to="/clientes/novo">
          Novo cliente
        </Link>
      </div>

      {isLoading && <p>Carregando…</p>}
      {error && <p className="form-error">{(error as Error).message}</p>}

      {customers && customers.length === 0 && <p>Nenhum cliente cadastrado ainda.</p>}

      {customers && customers.length > 0 && (
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
                <td>
                  <Link to={`/clientes/${customer.id}`}>{customer.name}</Link>
                </td>
                <td>{customer.document}</td>
                <td>{customer.kind === "individual" ? "Pessoa física" : "Pessoa jurídica"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
