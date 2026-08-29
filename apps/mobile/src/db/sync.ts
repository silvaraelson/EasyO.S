import { synchronize } from "@nozbe/watermelondb/sync";
import { database } from "./database";
import { authClient } from "../lib/auth-client";
import { syncStatusStore } from "./sync-status";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://easy-os-api.onrender.com";

interface ServerServiceOrder {
  id: string;
  number: number;
  serviceTypeId: string;
  customerId: string;
  addressId: string;
  priority: string;
  status: string;
  scheduledAt?: string | null;
  checkInAt?: string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkOutAt?: string | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  checklistResults: Record<string, boolean>;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

function toEpoch(value?: string | null) {
  return value ? new Date(value).getTime() : null;
}

function toRaw(order: ServerServiceOrder) {
  return {
    id: order.id,
    number: order.number,
    service_type_id: order.serviceTypeId,
    customer_id: order.customerId,
    address_id: order.addressId,
    priority: order.priority,
    status: order.status,
    scheduled_at: toEpoch(order.scheduledAt),
    check_in_at: toEpoch(order.checkInAt),
    check_in_latitude: order.checkInLatitude ?? null,
    check_in_longitude: order.checkInLongitude ?? null,
    check_out_at: toEpoch(order.checkOutAt),
    check_out_latitude: order.checkOutLatitude ?? null,
    check_out_longitude: order.checkOutLongitude ?? null,
    checklist_results: JSON.stringify(order.checklistResults ?? {}),
    description: order.description ?? null,
    created_at: new Date(order.createdAt).getTime(),
    updated_at: new Date(order.updatedAt).getTime(),
  };
}

/**
 * Ponte entre o protocolo do WatermelonDB e a API REST (GET /api/sync/pull,
 * POST /api/sync/push) — ver apps/api/src/routes/sync.ts. O servidor fala
 * JSON "normal" (camelCase, ISO dates); só aqui a gente converte pro formato
 * bruto (snake_case, epoch ms) que o WatermelonDB espera, e vice-versa.
 */
export async function runSync() {
  syncStatusStore.markSyncing();
  try {
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt }) => {
        const cookie = await authClient.getCookie();
        const url = `${API_URL}/api/sync/pull${
          lastPulledAt ? `?lastPulledAt=${lastPulledAt}` : ""
        }`;
        const response = await fetch(url, { headers: { Cookie: cookie } });
        if (!response.ok) {
          throw new Error(`Falha ao sincronizar (pull): ${response.status}`);
        }
        const body = await response.json();

        return {
          changes: {
            service_orders: {
              created: body.serviceOrders.created.map(toRaw),
              updated: body.serviceOrders.updated.map(toRaw),
              deleted: body.serviceOrders.deletedIds,
            },
          },
          timestamp: body.serverTimestamp,
        };
      },
      pushChanges: async ({ changes, lastPulledAt }) => {
        const rawChanges = changes as Record<string, { updated?: Record<string, unknown>[] }>;
        const updatedRaw = rawChanges.service_orders?.updated ?? [];
        if (updatedRaw.length === 0) return;

        const cookie = await authClient.getCookie();
        const updated = updatedRaw.map((raw) => ({
          id: raw.id,
          status: raw.status,
          checkInAt: raw.check_in_at
            ? new Date(raw.check_in_at as number).toISOString()
            : undefined,
          checkInLocation:
            raw.check_in_latitude != null && raw.check_in_longitude != null
              ? { latitude: raw.check_in_latitude, longitude: raw.check_in_longitude }
              : undefined,
          checkOutAt: raw.check_out_at
            ? new Date(raw.check_out_at as number).toISOString()
            : undefined,
          checkOutLocation:
            raw.check_out_latitude != null && raw.check_out_longitude != null
              ? { latitude: raw.check_out_latitude, longitude: raw.check_out_longitude }
              : undefined,
          checklistResults: raw.checklist_results
            ? JSON.parse(raw.checklist_results as string)
            : undefined,
        }));

        const response = await fetch(`${API_URL}/api/sync/push`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: cookie },
          body: JSON.stringify({ lastPulledAt, serviceOrders: { updated } }),
        });
        if (!response.ok) {
          throw new Error(`Falha ao sincronizar (push): ${response.status}`);
        }
      },
    });
    syncStatusStore.markSynced();
  } catch (error) {
    syncStatusStore.markError((error as Error).message);
    throw error;
  }
}
