import type { FastifyPluginAsync } from "fastify";
import { and, eq, gt } from "drizzle-orm";
import {
  SERVICE_ORDER_TRANSITIONS,
  syncPullQuerySchema,
  syncPushInputSchema,
  type ServiceOrderStatus,
} from "@easy-os/schemas";
import { db } from "../db/client.js";
import { serviceOrderEvents, serviceOrders } from "../db/schema.js";
import { requireAuth } from "../lib/guards.js";

/** OS ainda em aberto para um técnico — o que o app de campo mantém sincronizado. */
const TECHNICIAN_OPEN_STATUSES: ServiceOrderStatus[] = ["scheduled", "in_progress", "paused"];

/**
 * Protocolo de sync para o app de campo (Fase 3): pull incremental por
 * `updatedAt` e push restrito aos campos que a execução em campo pode
 * alterar. Resolução de conflito é last-write-wins simples — uma fila de
 * revisão para conflitos sinalizados fica para depois (ver plano, seção 07).
 */
export const syncRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  app.get("/sync/pull", async (request) => {
    const { lastPulledAt } = syncPullQuerySchema.parse(request.query);
    const currentUser = request.currentUser!;
    const since = lastPulledAt ? new Date(lastPulledAt) : new Date(0);
    const serverTimestamp = Date.now();

    const changed = await db
      .select()
      .from(serviceOrders)
      .where(
        and(eq(serviceOrders.assignedTechnicianId, currentUser.id), gt(serviceOrders.updatedAt, since)),
      );

    const created: typeof changed = [];
    const updated: typeof changed = [];
    const deletedIds: string[] = [];

    for (const order of changed) {
      if (!TECHNICIAN_OPEN_STATUSES.includes(order.status)) {
        deletedIds.push(order.id);
        continue;
      }
      if (order.createdAt > since) {
        created.push(order);
      } else {
        updated.push(order);
      }
    }

    return {
      serviceOrders: { created, updated, deletedIds },
      serverTimestamp,
    };
  });

  app.post("/sync/push", async (request) => {
    const input = syncPushInputSchema.parse(request.body);
    const currentUser = request.currentUser!;

    for (const change of input.serviceOrders.updated) {
      const [current] = await db.select().from(serviceOrders).where(eq(serviceOrders.id, change.id));
      if (!current || current.assignedTechnicianId !== currentUser.id) {
        continue; // não é uma OS desse técnico — ignora em vez de derrubar o sync inteiro
      }

      const patch: Partial<typeof serviceOrders.$inferInsert> = {};

      if (change.status && change.status !== current.status) {
        const allowed = SERVICE_ORDER_TRANSITIONS[current.status];
        if (allowed.includes(change.status)) {
          patch.status = change.status;
        }
      }
      if (change.checkInAt) patch.checkInAt = change.checkInAt;
      if (change.checkInLocation) {
        patch.checkInLatitude = change.checkInLocation.latitude;
        patch.checkInLongitude = change.checkInLocation.longitude;
      }
      if (change.checkOutAt) patch.checkOutAt = change.checkOutAt;
      if (change.checkOutLocation) {
        patch.checkOutLatitude = change.checkOutLocation.latitude;
        patch.checkOutLongitude = change.checkOutLocation.longitude;
      }
      if (change.checklistResults) patch.checklistResults = change.checklistResults;

      if (Object.keys(patch).length === 0) continue;

      await db.update(serviceOrders).set(patch).where(eq(serviceOrders.id, change.id));

      if (patch.status) {
        await db.insert(serviceOrderEvents).values({
          serviceOrderId: change.id,
          status: patch.status,
          createdBy: currentUser.id,
        });
      }
    }

    return { serverTimestamp: Date.now() };
  });
};
