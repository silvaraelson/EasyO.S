import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import {
  checkInInputSchema,
  checkOutInputSchema,
  createAttachmentInputSchema,
  createServiceOrderInputSchema,
  SERVICE_ORDER_TRANSITIONS,
  serviceOrderStatusSchema,
  updateChecklistInputSchema,
  updateTechnicalReportInputSchema,
} from "@easy-os/schemas";
import { db } from "../db/client.js";
import {
  addresses,
  budgetItems,
  budgets,
  customers,
  invoices,
  serviceOrderAttachments,
  serviceOrderEvents,
  serviceOrderMaterials,
  serviceOrders,
  user,
} from "../db/schema.js";
import { requireAuth } from "../lib/guards.js";
import { sendPushNotification } from "../lib/push.js";

const updateStatusBodySchema = z.object({
  status: serviceOrderStatusSchema,
  note: z.string().optional(),
});

const scheduleBodySchema = z.object({
  scheduledAt: z.coerce.date(),
  assignedTechnicianId: z.string().uuid().optional(),
});

/** OS ainda em aberto para um técnico — o que o app de campo mostra. */
const TECHNICIAN_OPEN_STATUSES = ["scheduled", "in_progress", "paused"] as const;

export const serviceOrderRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  app.get("/service-orders", async (request) => {
    const statusParam = (request.query as { status?: string }).status;
    const status = statusParam
      ? serviceOrderStatusSchema.safeParse(statusParam)
      : undefined;

    if (status?.success) {
      return db
        .select()
        .from(serviceOrders)
        .where(eq(serviceOrders.status, status.data))
        .orderBy(desc(serviceOrders.createdAt));
    }

    return db.select().from(serviceOrders).orderBy(desc(serviceOrders.createdAt));
  });

  /** OS do técnico logado, ainda em aberto — a lista do app de campo. */
  app.get("/service-orders/mine", async (request) => {
    const currentUser = request.currentUser!;
    return db
      .select()
      .from(serviceOrders)
      .where(
        and(
          eq(serviceOrders.assignedTechnicianId, currentUser.id),
          inArray(serviceOrders.status, TECHNICIAN_OPEN_STATUSES),
        ),
      )
      .orderBy(serviceOrders.scheduledAt);
  });

  /** Agenda: OS agendadas num intervalo (padrão: próximos 7 dias). */
  app.get("/service-orders/agenda", async (request) => {
    const query = z
      .object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() })
      .parse(request.query);
    const from = query.from ?? new Date();
    const to = query.to ?? new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);

    return db
      .select({
        id: serviceOrders.id,
        number: serviceOrders.number,
        status: serviceOrders.status,
        priority: serviceOrders.priority,
        scheduledAt: serviceOrders.scheduledAt,
        assignedTechnicianId: serviceOrders.assignedTechnicianId,
        technicianName: user.name,
        customerName: customers.name,
      })
      .from(serviceOrders)
      .leftJoin(user, eq(serviceOrders.assignedTechnicianId, user.id))
      .leftJoin(customers, eq(serviceOrders.customerId, customers.id))
      .where(and(gte(serviceOrders.scheduledAt, from), lte(serviceOrders.scheduledAt, to)))
      .orderBy(serviceOrders.scheduledAt);
  });

  app.get("/service-orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [serviceOrder] = await db
      .select()
      .from(serviceOrders)
      .where(eq(serviceOrders.id, id));

    if (!serviceOrder) {
      return reply.code(404).send({ message: "OS não encontrada" });
    }

    const [events, attachments, materialsUsed, [budget], [invoice]] = await Promise.all([
      db
        .select()
        .from(serviceOrderEvents)
        .where(eq(serviceOrderEvents.serviceOrderId, id))
        .orderBy(desc(serviceOrderEvents.createdAt)),
      db
        .select()
        .from(serviceOrderAttachments)
        .where(eq(serviceOrderAttachments.serviceOrderId, id))
        .orderBy(desc(serviceOrderAttachments.createdAt)),
      db.select().from(serviceOrderMaterials).where(eq(serviceOrderMaterials.serviceOrderId, id)),
      db.select().from(budgets).where(eq(budgets.serviceOrderId, id)),
      db.select().from(invoices).where(eq(invoices.serviceOrderId, id)),
    ]);

    const budgetItemsList = budget
      ? await db.select().from(budgetItems).where(eq(budgetItems.budgetId, budget.id))
      : [];

    return {
      ...serviceOrder,
      events,
      attachments,
      materialsUsed,
      budget: budget ? { ...budget, items: budgetItemsList } : null,
      invoice: invoice ?? null,
    };
  });

  app.post("/service-orders", async (request, reply) => {
    const input = createServiceOrderInputSchema.parse(request.body);
    const currentUser = request.currentUser!;

    const [address] = await db
      .select({ customerId: addresses.customerId })
      .from(addresses)
      .where(eq(addresses.id, input.addressId));

    if (!address) {
      return reply.code(422).send({ message: "Endereço informado não existe" });
    }
    if (address.customerId !== input.customerId) {
      return reply
        .code(422)
        .send({ message: "O endereço informado não pertence a esse cliente" });
    }

    const [serviceOrder] = await db
      .insert(serviceOrders)
      .values({ ...input, status: "draft", createdBy: currentUser.id })
      .returning();
    if (!serviceOrder) {
      return reply.code(500).send({ message: "Falha ao criar a OS" });
    }

    await db.insert(serviceOrderEvents).values({
      serviceOrderId: serviceOrder.id,
      status: "draft",
      createdBy: currentUser.id,
    });

    return reply.code(201).send(serviceOrder);
  });

  app.post("/service-orders/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, note } = updateStatusBodySchema.parse(request.body);
    const currentUser = request.currentUser!;

    const [current] = await db
      .select()
      .from(serviceOrders)
      .where(eq(serviceOrders.id, id));
    if (!current) {
      return reply.code(404).send({ message: "OS não encontrada" });
    }

    const allowed = SERVICE_ORDER_TRANSITIONS[current.status];
    if (!allowed.includes(status)) {
      return reply.code(422).send({
        message: `Não é possível mudar de "${current.status}" para "${status}"`,
      });
    }

    const [updated] = await db
      .update(serviceOrders)
      .set({ status })
      .where(eq(serviceOrders.id, id))
      .returning();

    await db.insert(serviceOrderEvents).values({
      serviceOrderId: id,
      status,
      note,
      createdBy: currentUser.id,
    });

    return updated;
  });

  app.post("/service-orders/:id/schedule", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = scheduleBodySchema.parse(request.body);
    const currentUser = request.currentUser!;

    const [current] = await db
      .select()
      .from(serviceOrders)
      .where(eq(serviceOrders.id, id));
    if (!current) {
      return reply.code(404).send({ message: "OS não encontrada" });
    }

    const allowed = SERVICE_ORDER_TRANSITIONS[current.status];
    if (!allowed.includes("scheduled")) {
      return reply.code(422).send({
        message: `Não é possível agendar uma OS em "${current.status}"`,
      });
    }

    const [updated] = await db
      .update(serviceOrders)
      .set({
        status: "scheduled",
        scheduledAt: input.scheduledAt,
        assignedTechnicianId: input.assignedTechnicianId,
      })
      .where(eq(serviceOrders.id, id))
      .returning();

    await db.insert(serviceOrderEvents).values({
      serviceOrderId: id,
      status: "scheduled",
      createdBy: currentUser.id,
    });

    if (updated?.assignedTechnicianId) {
      const [technician] = await db
        .select({ pushToken: user.pushToken })
        .from(user)
        .where(eq(user.id, updated.assignedTechnicianId));
      if (technician?.pushToken) {
        const when = updated.scheduledAt
          ? new Date(updated.scheduledAt).toLocaleString("pt-BR")
          : "";
        await sendPushNotification(technician.pushToken, {
          title: `Nova OS agendada — #${updated.number}`,
          body: when ? `Para ${when}` : "Confira os detalhes no app",
          data: { serviceOrderId: id },
        });
      }
    }

    return updated;
  });

  app.post("/service-orders/:id/check-in", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = checkInInputSchema.parse(request.body);
    const currentUser = request.currentUser!;

    const [current] = await db
      .select()
      .from(serviceOrders)
      .where(eq(serviceOrders.id, id));
    if (!current) {
      return reply.code(404).send({ message: "OS não encontrada" });
    }

    const allowed = SERVICE_ORDER_TRANSITIONS[current.status];
    if (!allowed.includes("in_progress")) {
      return reply.code(422).send({
        message: `Não é possível fazer check-in de uma OS em "${current.status}"`,
      });
    }

    const [updated] = await db
      .update(serviceOrders)
      .set({
        status: "in_progress",
        checkInAt: new Date(),
        checkInLatitude: input.location?.latitude,
        checkInLongitude: input.location?.longitude,
      })
      .where(eq(serviceOrders.id, id))
      .returning();

    await db.insert(serviceOrderEvents).values({
      serviceOrderId: id,
      status: "in_progress",
      createdBy: currentUser.id,
    });

    return updated;
  });

  app.post("/service-orders/:id/check-out", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = checkOutInputSchema.parse(request.body);
    const currentUser = request.currentUser!;

    const [current] = await db
      .select()
      .from(serviceOrders)
      .where(eq(serviceOrders.id, id));
    if (!current) {
      return reply.code(404).send({ message: "OS não encontrada" });
    }

    const allowed = SERVICE_ORDER_TRANSITIONS[current.status];
    if (!allowed.includes("completed")) {
      return reply.code(422).send({
        message: `Não é possível fazer check-out de uma OS em "${current.status}"`,
      });
    }

    const [updated] = await db
      .update(serviceOrders)
      .set({
        status: "completed",
        checkOutAt: new Date(),
        checkOutLatitude: input.location?.latitude,
        checkOutLongitude: input.location?.longitude,
      })
      .where(eq(serviceOrders.id, id))
      .returning();

    await db.insert(serviceOrderEvents).values({
      serviceOrderId: id,
      status: "completed",
      createdBy: currentUser.id,
    });

    return updated;
  });

  app.patch("/service-orders/:id/checklist", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateChecklistInputSchema.parse(request.body);

    const [updated] = await db
      .update(serviceOrders)
      .set({ checklistResults: input.checklistResults })
      .where(eq(serviceOrders.id, id))
      .returning();

    if (!updated) {
      return reply.code(404).send({ message: "OS não encontrada" });
    }
    return updated;
  });

  app.patch("/service-orders/:id/technical-report", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateTechnicalReportInputSchema.parse(request.body);

    const [updated] = await db
      .update(serviceOrders)
      .set({ technicalReport: input.technicalReport })
      .where(eq(serviceOrders.id, id))
      .returning();

    if (!updated) {
      return reply.code(404).send({ message: "OS não encontrada" });
    }
    return updated;
  });

  app.post("/service-orders/:id/attachments", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = createAttachmentInputSchema.parse(request.body);

    const [serviceOrder] = await db
      .select({ id: serviceOrders.id })
      .from(serviceOrders)
      .where(eq(serviceOrders.id, id));
    if (!serviceOrder) {
      return reply.code(404).send({ message: "OS não encontrada" });
    }

    const [attachment] = await db
      .insert(serviceOrderAttachments)
      .values({ serviceOrderId: id, kind: input.kind, url: input.dataUrl })
      .returning();

    return reply.code(201).send(attachment);
  });
};
