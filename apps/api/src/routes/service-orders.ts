import type { FastifyPluginAsync } from "fastify";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  createServiceOrderInputSchema,
  SERVICE_ORDER_TRANSITIONS,
  serviceOrderStatusSchema,
} from "@easy-os/schemas";
import { db } from "../db/client.js";
import { addresses, serviceOrderEvents, serviceOrders } from "../db/schema.js";
import { requireAuth } from "../lib/guards.js";

const updateStatusBodySchema = z.object({
  status: serviceOrderStatusSchema,
  note: z.string().optional(),
});

const scheduleBodySchema = z.object({
  scheduledAt: z.coerce.date(),
  assignedTechnicianId: z.string().uuid().optional(),
});

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

  app.get("/service-orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [serviceOrder] = await db
      .select()
      .from(serviceOrders)
      .where(eq(serviceOrders.id, id));

    if (!serviceOrder) {
      return reply.code(404).send({ message: "OS não encontrada" });
    }

    const events = await db
      .select()
      .from(serviceOrderEvents)
      .where(eq(serviceOrderEvents.serviceOrderId, id))
      .orderBy(desc(serviceOrderEvents.createdAt));

    return { ...serviceOrder, events };
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

    return updated;
  });
};
