import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import {
  addressSchema,
  contactSchema,
  createCustomerInputSchema,
} from "@easy-os/schemas";
import { db } from "../db/client.js";
import { addresses, contacts, customers } from "../db/schema.js";
import { requireAuth } from "../lib/guards.js";

const createAddressInputSchema = addressSchema.omit({
  id: true,
  customerId: true,
});
const createContactInputSchema = contactSchema.omit({
  id: true,
  customerId: true,
});

export const customerRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

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

    const [customerAddresses, customerContacts] = await Promise.all([
      db.select().from(addresses).where(eq(addresses.customerId, id)),
      db.select().from(contacts).where(eq(contacts.customerId, id)),
    ]);

    return { ...customer, addresses: customerAddresses, contacts: customerContacts };
  });

  app.post("/customers", async (request, reply) => {
    const input = createCustomerInputSchema.parse(request.body);
    const [customer] = await db.insert(customers).values(input).returning();
    return reply.code(201).send(customer);
  });

  app.post("/customers/:id/addresses", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, id));
    if (!customer) {
      return reply.code(404).send({ message: "Cliente não encontrado" });
    }

    const input = createAddressInputSchema.parse(request.body);
    const [address] = await db
      .insert(addresses)
      .values({ ...input, customerId: id })
      .returning();
    return reply.code(201).send(address);
  });

  app.post("/customers/:id/contacts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, id));
    if (!customer) {
      return reply.code(404).send({ message: "Cliente não encontrado" });
    }

    const input = createContactInputSchema.parse(request.body);
    const [contact] = await db
      .insert(contacts)
      .values({ ...input, customerId: id })
      .returning();
    return reply.code(201).send(contact);
  });
};
