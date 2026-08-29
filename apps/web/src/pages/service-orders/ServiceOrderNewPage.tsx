import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Priority } from "@easy-os/schemas";
import { api } from "../../lib/api";
import { PRIORITY_LABELS } from "../../lib/labels";

export function ServiceOrderNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [customerId, setCustomerId] = useState(searchParams.get("clienteId") ?? "");
  const [addressId, setAddressId] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [description, setDescription] = useState("");

  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: api.customers.list });
  const { data: serviceTypes } = useQuery({
    queryKey: ["service-types"],
    queryFn: api.serviceTypes.list,
  });
  const { data: selectedCustomer } = useQuery({
    queryKey: ["customers", customerId],
    queryFn: () => api.customers.get(customerId),
    enabled: Boolean(customerId),
  });

  useEffect(() => {
    setAddressId("");
  }, [customerId]);

  const mutation = useMutation({
    mutationFn: api.serviceOrders.create,
    onSuccess: (serviceOrder) => {
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      navigate(`/ordens-de-servico/${serviceOrder.id}`);
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({
      customerId,
      addressId,
      serviceTypeId,
      priority,
      description: description || undefined,
    });
  }

  function handleServiceTypeChange(id: string) {
    setServiceTypeId(id);
    const serviceType = serviceTypes?.find((item) => item.id === id);
    if (serviceType) setPriority(serviceType.defaultPriority);
  }

  return (
    <section>
      <h1>Nova Ordem de Serviço</h1>
      <form className="card form" onSubmit={handleSubmit}>
        <label>
          Cliente
          <select
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            required
          >
            <option value="">Selecione…</option>
            {customers?.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Endereço de atendimento
          <select
            value={addressId}
            onChange={(event) => setAddressId(event.target.value)}
            required
            disabled={!customerId}
          >
            <option value="">Selecione…</option>
            {selectedCustomer?.addresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.label} — {address.street}, {address.number}
              </option>
            ))}
          </select>
          {customerId && selectedCustomer && selectedCustomer.addresses.length === 0 && (
            <p className="muted">Esse cliente ainda não tem endereço cadastrado.</p>
          )}
        </label>

        <label>
          Tipo de serviço
          <select
            value={serviceTypeId}
            onChange={(event) => handleServiceTypeChange(event.target.value)}
            required
          >
            <option value="">Selecione…</option>
            {serviceTypes?.map((serviceType) => (
              <option key={serviceType.id} value={serviceType.id}>
                {serviceType.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Prioridade
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
          >
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Descrição
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
        </label>

        {mutation.isError && <p className="form-error">{(mutation.error as Error).message}</p>}
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Criando…" : "Criar OS"}
        </button>
      </form>
    </section>
  );
}
