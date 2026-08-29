import type { FastifyPluginAsync } from "fastify";
import { createMaterialInputSchema } from "@easy-os/schemas";
import { db } from "../db/client.js";
import { materials } from "../db/schema.js";
import { requireAuth, requireRole } from "../lib/guards.js";

export const materialRoutes: FastifyPluginAsync = async (app) => {
  app.get("/materials", { preHandler: requireAuth }, async () => {
    return db.select().from(materials);
  });

  app.post(
    "/materials",
    { preHandler: requireRole("admin", "manager") },
    async (request, reply) => {
      const input = createMaterialInputSchema.parse(request.body);
      const [material] = await db.insert(materials).values(input).returning();
      return reply.code(201).send(material);
    },
  );
};
