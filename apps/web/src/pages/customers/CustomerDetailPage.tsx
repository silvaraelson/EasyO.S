import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ["customers", id],
    queryFn: () => api.customers.get(id!),
    enabled: Boolean(id),
  });

  const [addressForm, setAddressForm] = useState({
    label: "",
    street: "",
    number: "",
    district: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [contactForm, setContactForm] = useState({ name: "", phone: "", email: "" });

  const addressMutation = useMutation({
    mutationFn: (input: typeof addressForm) => api.customers.addAddress(id!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", id] });
      setAddressForm({ label: "", street: "", number: "", district: "", city: "", state: "", zipCode: "" });
    },
  });

  const contactMutation = useMutation({
    mutationFn: (input: typeof contactForm) =>
      api.customers.addContact(id!, { ...input, isPrimary: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", id] });
      setContactForm({ name: "", phone: "", email: "" });
    },
  });

  if (isLoading) return <p>Carregando…</p>;
  if (error) return <p className="form-error">{(error as Error).message}</p>;
  if (!customer) return null;

  return (
    <section>
      <div className="page-header">
        <h1>{customer.name}</h1>
        <Link className="button" to={`/ordens-de-servico/nova?clienteId=${customer.id}`}>
          Abrir OS para esse cliente
        </Link>
      </div>
      <p className="muted">
        {customer.kind === "individual" ? "Pessoa física" : "Pessoa jurídica"} · {customer.document}
      </p>

      <div className="two-column">
        <div className="card">
          <h2>Endereços</h2>
          {customer.addresses.length === 0 && <p className="muted">Nenhum endereço cadastrado.</p>}
          <ul className="plain-list">
            {customer.addresses.map((address) => (
              <li key={address.id}>
                <strong>{address.label}</strong> — {address.street}, {address.number} ·{" "}
                {address.city}/{address.state}
              </li>
            ))}
          </ul>

          <form
            className="form"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              addressMutation.mutate(addressForm);
            }}
          >
            <label>
              Identificação
              <input
                placeholder="Ex.: Matriz, Casa"
                value={addressForm.label}
                onChange={(event) => setAddressForm({ ...addressForm, label: event.target.value })}
                required
              />
            </label>
            <div className="form-row">
              <label>
                Rua
                <input
                  value={addressForm.street}
                  onChange={(event) => setAddressForm({ ...addressForm, street: event.target.value })}
                  required
                />
              </label>
              <label className="short">
                Número
                <input
                  value={addressForm.number}
                  onChange={(event) => setAddressForm({ ...addressForm, number: event.target.value })}
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Bairro
                <input
                  value={addressForm.district}
                  onChange={(event) => setAddressForm({ ...addressForm, district: event.target.value })}
                  required
                />
              </label>
              <label>
                Cidade
                <input
                  value={addressForm.city}
                  onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })}
                  required
                />
              </label>
              <label className="short">
                UF
                <input
                  maxLength={2}
                  value={addressForm.state}
                  onChange={(event) =>
                    setAddressForm({ ...addressForm, state: event.target.value.toUpperCase() })
                  }
                  required
                />
              </label>
              <label className="short">
                CEP
                <input
                  value={addressForm.zipCode}
                  onChange={(event) => setAddressForm({ ...addressForm, zipCode: event.target.value })}
                  required
                />
              </label>
            </div>
            <button type="submit" disabled={addressMutation.isPending}>
              {addressMutation.isPending ? "Adicionando…" : "Adicionar endereço"}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Contatos</h2>
          {customer.contacts.length === 0 && <p className="muted">Nenhum contato cadastrado.</p>}
          <ul className="plain-list">
            {customer.contacts.map((contact) => (
              <li key={contact.id}>
                <strong>{contact.name}</strong>
                {contact.phone && ` · ${contact.phone}`}
                {contact.email && ` · ${contact.email}`}
              </li>
            ))}
          </ul>

          <form
            className="form"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              contactMutation.mutate(contactForm);
            }}
          >
            <label>
              Nome
              <input
                value={contactForm.name}
                onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })}
                required
              />
            </label>
            <div className="form-row">
              <label>
                Telefone
                <input
                  value={contactForm.phone}
                  onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })}
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })}
                />
              </label>
            </div>
            <button type="submit" disabled={contactMutation.isPending}>
              {contactMutation.isPending ? "Adicionando…" : "Adicionar contato"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
