import type {
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

/**
 * Chamadas diretas à API — hoje só para o que ainda não passa pelo sync do
 * WatermelonDB (tipos de serviço, fotos). Check-in/out e checklist vão pela
 * fila de sync local (ver src/db/sync.ts), não por aqui.
 */
export const api = {
  serviceOrders: {
    get: (id: string) => apiFetch<ServiceOrderDetail>(`/api/service-orders/${id}`),
    addAttachment: (id: string, input: CreateAttachmentInput) =>
      apiFetch<ServiceOrderAttachment>(`/api/service-orders/${id}/attachments`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
  serviceTypes: {
    list: () => apiFetch<ServiceType[]>("/api/service-types"),
  },
};
