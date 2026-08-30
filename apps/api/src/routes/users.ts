import type { FastifyPluginAsync } from "fastify";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import {
  createUserWithPasswordInputSchema,
  resetUserPasswordInputSchema,
  updateUserInputSchema,
} from "@easy-os/schemas";
import { auth } from "../auth.js";
import { db } from "../db/client.js";
import { account, user } from "../db/schema.js";
import { requireAuth, requireRole } from "../lib/guards.js";

const pushTokenInputSchema = z.object({ token: z.string().min(1) });

/** Lista enxuta de usuários — usada tanto para popular seletores (técnico ao
 * agendar uma OS) quanto pela tela de gestão de acessos (admin). */
export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get("/users", { preHandler: requireAuth }, async (request) => {
    const { role } = request.query as { role?: string };
    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        team: user.team,
        active: user.active,
        createdAt: user.createdAt,
      })
      .from(user);

    return role ? rows.filter((row) => row.role === role) : rows;
  });

  app.post("/users", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = createUserWithPasswordInputSchema.parse(request.body);

    const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, input.email));
    if (existing) {
      return reply.code(422).send({ message: "Já existe um usuário com esse e-mail" });
    }

    await auth.api.signUpEmail({
      body: { email: input.email, name: input.name, password: input.password },
    });

    const [created] = await db
      .update(user)
      .set({ role: input.role, team: input.team, active: input.active })
      .where(eq(user.email, input.email))
      .returning();

    if (!created) {
      return reply.code(500).send({ message: "Falha ao criar o usuário" });
    }
    return reply.code(201).send(created);
  });

  app.patch("/users/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateUserInputSchema.parse(request.body);

    const [updated] = await db.update(user).set(input).where(eq(user.id, id)).returning();
    if (!updated) {
      return reply.code(404).send({ message: "Usuário não encontrado" });
    }
    return updated;
  });

  app.post(
    "/users/:id/reset-password",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = resetUserPasswordInputSchema.parse(request.body);

      const hashed = await hashPassword(input.password);
      const [updated] = await db
        .update(account)
        .set({ password: hashed })
        .where(and(eq(account.userId, id), eq(account.providerId, "credential")))
        .returning({ id: account.id });

      if (!updated) {
        return reply.code(404).send({ message: "Usuário não encontrado ou sem login por senha" });
      }
      return { ok: true };
    },
  );

  /** O app mobile chama isso depois do login pra registrar onde mandar push. */
  app.post("/users/me/push-token", { preHandler: requireAuth }, async (request) => {
    const { token } = pushTokenInputSchema.parse(request.body);
    const currentUser = request.currentUser!;
    await db.update(user).set({ pushToken: token }).where(eq(user.id, currentUser.id));
    return { ok: true };
  });
};
