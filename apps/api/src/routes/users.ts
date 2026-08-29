import type { FastifyPluginAsync } from "fastify";
import { db } from "../db/client.js";
import { user } from "../db/schema.js";
import { requireAuth } from "../lib/guards.js";

/** Lista enxuta de usuários — hoje só para popular o seletor de técnico ao agendar uma OS. */
export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get("/users", { preHandler: requireAuth }, async (request) => {
    const { role } = request.query as { role?: string };
    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      })
      .from(user);

    return role ? rows.filter((row) => row.role === role) : rows;
  });
};
