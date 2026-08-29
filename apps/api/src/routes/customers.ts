import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { createCustomerInputSchema } from "@easy-os/schemas";
import { db } from "../db/client.js";
import { customers } from "../db/schema.js";

export const customerRoutes: FastifyPluginAsync = async (app) => {
  app.get("/customers", async () => {
    return db.select().from(customers);
  });

  app.get("/customers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!customer) {
      return reply.code(404).send({ message: "Cliente não encontrado" });
    }
    return customer;
  });

  app.post("/customers", async (request, reply) => {
    const input = createCustomerInputSchema.parse(request.body);
    const [customer] = await db.insert(customers).values(input).returning();
    return reply.code(201).send(customer);
  });
};
