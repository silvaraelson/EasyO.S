import type { FastifyPluginAsync } from "fastify";
import { eq, sql } from "drizzle-orm";
import {
  createMaterialInputSchema,
  restockMaterialInputSchema,
  updateMaterialInputSchema,
} from "@easy-os/schemas";
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

  app.patch(
    "/materials/:id",
    { preHandler: requireRole("admin", "manager") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateMaterialInputSchema.parse(request.body);

      const [material] = await db
        .update(materials)
        .set(input)
        .where(eq(materials.id, id))
        .returning();

      if (!material) {
        return reply.code(404).send({ message: "Material não encontrado" });
      }
      return material;
    },
  );

  /** Entrada de estoque — soma a quantidade recebida ao estoque atual. */
  app.post(
    "/materials/:id/restock",
    { preHandler: requireRole("admin", "manager") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = restockMaterialInputSchema.parse(request.body);

      const [material] = await db
        .update(materials)
        .set({ stockQuantity: sql`${materials.stockQuantity} + ${input.quantity}` })
        .where(eq(materials.id, id))
        .returning();

      if (!material) {
        return reply.code(404).send({ message: "Material não encontrado" });
      }
      return material;
    },
  );
};
