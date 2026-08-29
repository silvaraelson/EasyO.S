import type {
  CheckInInput,
  CheckOutInput,
  ChecklistResults,
  CreateAttachmentInput,
  ServiceOrder,
  ServiceOrderAttachment,
  ServiceOrderEvent,
  ServiceType,
} from "@easy-os/schemas";
import { authClient } from "./auth-client";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://easy-os-api.onrender.com";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookie = await authClient.getCookie();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `API ${path} respondeu ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type ServiceOrderDetail = ServiceOrder & {
  events: ServiceOrderEvent[];
  attachments: ServiceOrderAttachment[];
};

export const api = {
  serviceOrders: {
    mine: () => apiFetch<ServiceOrder[]>("/api/service-orders/mine"),
    get: (id: string) => apiFetch<ServiceOrderDetail>(`/api/service-orders/${id}`),
    checkIn: (id: string, input: CheckInInput) =>
      apiFetch<ServiceOrder>(`/api/service-orders/${id}/check-in`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    checkOut: (id: string, input: CheckOutInput) =>
      apiFetch<ServiceOrder>(`/api/service-orders/${id}/check-out`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    updateChecklist: (id: string, checklistResults: ChecklistResults) =>
      apiFetch<ServiceOrder>(`/api/service-orders/${id}/checklist`, {
        method: "PATCH",
        body: JSON.stringify({ checklistResults }),
      }),
    addAttachment: (id: string, input: CreateAttachmentInput) =>
      apiFetch<ServiceOrderAttachment>(`/api/service-orders/${id}/attachments`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
  serviceTypes: {
    list: () => apiFetch<ServiceType[]>("/api/service-types"),
  },
  customers: {
    get: (id: string) =>
      apiFetch<{ id: string; name: string; document: string }>(`/api/customers/${id}`),
  },
};
