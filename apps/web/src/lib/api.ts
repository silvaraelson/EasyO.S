import type {
  Address,
  Contact,
  CreateCustomerInput,
  CreateServiceOrderInput,
  CreateServiceTypeInput,
  Customer,
  ServiceOrder,
  ServiceOrderEvent,
  ServiceOrderStatus,
  ServiceType,
  UserRole,
} from "@easy-os/schemas";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `A API respondeu ${response.status} em ${path}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type CustomerDetail = Customer & { addresses: Address[]; contacts: Contact[] };
export type ServiceOrderDetail = ServiceOrder & { events: ServiceOrderEvent[] };
export type BasicUser = { id: string; name: string; email: string; role: UserRole };

export const api = {
  customers: {
    list: () => apiFetch<Customer[]>("/api/customers"),
    get: (id: string) => apiFetch<CustomerDetail>(`/api/customers/${id}`),
    create: (input: CreateCustomerInput) =>
      apiFetch<Customer>("/api/customers", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    addAddress: (customerId: string, input: Omit<Address, "id" | "customerId">) =>
      apiFetch<Address>(`/api/customers/${customerId}/addresses`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    addContact: (customerId: string, input: Omit<Contact, "id" | "customerId">) =>
      apiFetch<Contact>(`/api/customers/${customerId}/contacts`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
  serviceTypes: {
    list: () => apiFetch<ServiceType[]>("/api/service-types"),
    create: (input: CreateServiceTypeInput) =>
      apiFetch<ServiceType>("/api/service-types", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
  serviceOrders: {
    list: (status?: ServiceOrderStatus) =>
      apiFetch<ServiceOrder[]>(`/api/service-orders${status ? `?status=${status}` : ""}`),
    get: (id: string) => apiFetch<ServiceOrderDetail>(`/api/service-orders/${id}`),
    create: (input: CreateServiceOrderInput) =>
      apiFetch<ServiceOrder>("/api/service-orders", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    updateStatus: (id: string, status: ServiceOrderStatus, note?: string) =>
      apiFetch<ServiceOrder>(`/api/service-orders/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status, note }),
      }),
    schedule: (id: string, scheduledAt: string, assignedTechnicianId?: string) =>
      apiFetch<ServiceOrder>(`/api/service-orders/${id}/schedule`, {
        method: "POST",
        body: JSON.stringify({ scheduledAt, assignedTechnicianId }),
      }),
  },
  users: {
    list: (role?: UserRole) => apiFetch<BasicUser[]>(`/api/users${role ? `?role=${role}` : ""}`),
  },
};
