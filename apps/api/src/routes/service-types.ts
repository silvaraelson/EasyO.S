import type { FastifyPluginAsync } from "fastify";
import { createServiceTypeInputSchema } from "@easy-os/schemas";
import { db } from "../db/client.js";
import { serviceTypes } from "../db/schema.js";
import { requireAuth, requireRole } from "../lib/guards.js";

export const serviceTypeRoutes: FastifyPluginAsync = async (app) => {
  app.get("/service-types", { preHandler: requireAuth }, async () => {
    return db.select().from(serviceTypes);
  });

  app.post(
    "/service-types",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const input = createServiceTypeInputSchema.parse(request.body);
      const [serviceType] = await db
        .insert(serviceTypes)
        .values(input)
        .returning();
      return reply.code(201).send(serviceType);
    },
  );
};
