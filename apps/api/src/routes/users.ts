import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { user } from "../db/schema.js";
import { requireAuth } from "../lib/guards.js";

const pushTokenInputSchema = z.object({ token: z.string().min(1) });

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

  /** O app mobile chama isso depois do login pra registrar onde mandar push. */
  app.post("/users/me/push-token", { preHandler: requireAuth }, async (request) => {
    const { token } = pushTokenInputSchema.parse(request.body);
    const currentUser = request.currentUser!;
    await db.update(user).set({ pushToken: token }).where(eq(user.id, currentUser.id));
    return { ok: true };
  });
};
