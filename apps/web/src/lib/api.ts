import type {
  Address,
  Budget,
  CompanySettings,
  Contact,
  CreateBudgetInput,
  CreateCustomerInput,
  CreateMaterialInput,
  CreateServiceOrderInput,
  CreateServiceTypeInput,
  CreateUserWithPasswordInput,
  Customer,
  Invoice,
  Material,
  PaymentMethod,
  Priority,
  ServiceOrder,
  ServiceOrderAttachment,
  ServiceOrderEvent,
  ServiceOrderMaterial,
  ServiceOrderStatus,
  ServiceType,
  UpdateCompanySettingsInput,
  UpdateMaterialInput,
  UpdateUserInput,
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
export type ServiceOrderDetail = ServiceOrder & {
  events: ServiceOrderEvent[];
  attachments: ServiceOrderAttachment[];
  materialsUsed: ServiceOrderMaterial[];
  budget: (Budget & { items: { id: string; description: string; quantity: number; unitPrice: number }[] }) | null;
  invoice: Invoice | null;
};
export type BasicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team?: string | null;
  active: boolean;
  createdAt: string;
};

export interface DashboardSummary {
  range: { from: string; to: string };
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  ordersByServiceType: { serviceTypeId: string; name: string; count: number }[];
  ordersByTechnician: { technicianId: string; name: string; completedCount: number }[];
  slaCompliance: { met: number; total: number; rate: number | null };
  avgResolutionHours: number | null;
  firstTimeFixRate: number | null;
  ticketMedio: number;
  totalRevenue: number;
  invoiceCount: number;
  lowStockMaterials: {
    id: string;
    sku: string;
    description: string;
    stockQuantity: number;
    lowStockThreshold: number | null;
  }[];
}

export interface AgendaItem {
  id: string;
  number: number;
  status: ServiceOrderStatus;
  priority: Priority;
  scheduledAt: string | null;
  assignedTechnicianId: string | null;
  technicianName: string | null;
  customerName: string | null;
}

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
    agenda: (from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const query = params.toString();
      return apiFetch<AgendaItem[]>(`/api/service-orders/agenda${query ? `?${query}` : ""}`);
    },
    updateTechnicalReport: (id: string, technicalReport: string) =>
      apiFetch<ServiceOrder>(`/api/service-orders/${id}/technical-report`, {
        method: "PATCH",
        body: JSON.stringify({ technicalReport }),
      }),
  },
  users: {
    list: (role?: UserRole) => apiFetch<BasicUser[]>(`/api/users${role ? `?role=${role}` : ""}`),
    create: (input: CreateUserWithPasswordInput) =>
      apiFetch<BasicUser>("/api/users", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: UpdateUserInput) =>
      apiFetch<BasicUser>(`/api/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    resetPassword: (id: string, password: string) =>
      apiFetch<{ ok: boolean }>(`/api/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
  },
  materials: {
    list: () => apiFetch<Material[]>("/api/materials"),
    create: (input: CreateMaterialInput) =>
      apiFetch<Material>("/api/materials", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: UpdateMaterialInput) =>
      apiFetch<Material>(`/api/materials/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    restock: (id: string, quantity: number) =>
      apiFetch<Material>(`/api/materials/${id}/restock`, {
        method: "POST",
        body: JSON.stringify({ quantity }),
      }),
  },
  companySettings: {
    get: () => apiFetch<CompanySettings>("/api/company-settings"),
    update: (input: UpdateCompanySettingsInput) =>
      apiFetch<CompanySettings>("/api/company-settings", {
        method: "PUT",
        body: JSON.stringify(input),
      }),
  },
  finance: {
    addMaterialUsage: (serviceOrderId: string, materialId: string, quantity: number) =>
      apiFetch<ServiceOrderMaterial>(`/api/service-orders/${serviceOrderId}/materials`, {
        method: "POST",
        body: JSON.stringify({ materialId, quantity }),
      }),
    createBudget: (serviceOrderId: string, input: CreateBudgetInput) =>
      apiFetch<Budget>(`/api/service-orders/${serviceOrderId}/budget`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    approveBudget: (budgetId: string) =>
      apiFetch<Budget>(`/api/budgets/${budgetId}/approve`, { method: "POST" }),
    createInvoice: (serviceOrderId: string, paymentMethod?: PaymentMethod) =>
      apiFetch<Invoice>(`/api/service-orders/${serviceOrderId}/invoice`, {
        method: "POST",
        body: JSON.stringify({ paymentMethod }),
      }),
    payInvoice: (invoiceId: string, paymentMethod: PaymentMethod) =>
      apiFetch<Invoice>(`/api/invoices/${invoiceId}/pay`, {
        method: "POST",
        body: JSON.stringify({ paymentMethod }),
      }),
    invoicePdfUrl: (invoiceId: string) => `${API_URL}/api/invoices/${invoiceId}/pdf`,
    technicalReportPdfUrl: (serviceOrderId: string) =>
      `${API_URL}/api/service-orders/${serviceOrderId}/pdf/laudo-tecnico`,
    materialsListPdfUrl: (serviceOrderId: string) =>
      `${API_URL}/api/service-orders/${serviceOrderId}/pdf/lista-materiais`,
  },
  dashboard: {
    summary: (from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const query = params.toString();
      return apiFetch<DashboardSummary>(`/api/dashboard/summary${query ? `?${query}` : ""}`);
    },
  },
};
