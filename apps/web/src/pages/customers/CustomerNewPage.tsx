import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { CustomerKind } from "@easy-os/schemas";
import { api } from "../../lib/api";

export function CustomerNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<CustomerKind>("individual");
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: api.customers.create,
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      navigate(`/clientes/${customer.id}`);
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({
      kind,
      name,
      document: document.replace(/\D/g, ""),
      notes: notes || undefined,
    });
  }

  return (
    <section>
      <h1>Novo cliente</h1>
      <form className="card form" onSubmit={handleSubmit}>
        <label>
          Tipo
          <select value={kind} onChange={(event) => setKind(event.target.value as CustomerKind)}>
            <option value="individual">Pessoa física</option>
            <option value="company">Pessoa jurídica</option>
          </select>
        </label>
        <label>
          Nome {kind === "company" ? "/ Razão social" : "completo"}
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          {kind === "individual" ? "CPF" : "CNPJ"}
          <input
            value={document}
            onChange={(event) => setDocument(event.target.value)}
            required
            minLength={11}
          />
        </label>
        <label>
          Observações
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        </label>
        {mutation.isError && (
          <p className="form-error">{(mutation.error as Error).message}</p>
        )}
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Salvar cliente"}
        </button>
      </form>
    </section>
  );
}
