import type { FastifyPluginAsync } from "fastify";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth.js";

/**
 * Better Auth lê e faz o parse do corpo da requisição sozinho — por isso o
 * content-type parser padrão do Fastify é desativado aqui, mas só dentro
 * deste plugin (escopo encapsulado), sem afetar as outras rotas.
 */
export const authRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser("application/json", (_request, _payload, done) => {
    done(null, undefined);
  });

  app.all("/api/auth/*", async (request, reply) => {
    await toNodeHandler(auth)(request.raw, reply.raw);
  });
};
