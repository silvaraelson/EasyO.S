import type { FastifyPluginAsync } from "fastify";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth.js";
import { env } from "../env.js";

/**
 * Better Auth lê e faz o parse do corpo da requisição sozinho — por isso o
 * content-type parser padrão do Fastify é desativado aqui, mas só dentro
 * deste plugin (escopo encapsulado), sem afetar as outras rotas.
 *
 * Como o handler escreve direto em reply.raw (bypassando o ciclo de vida do
 * Fastify), o hook onSend do @fastify/cors nunca roda pras respostas reais
 * (só pro preflight OPTIONS, que o cors intercepta antes da rota) — por
 * isso os headers de CORS são aplicados manualmente aqui.
 */
export const authRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser("application/json", (_request, _payload, done) => {
    done(null, undefined);
  });

  app.all("/api/auth/*", async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && env.WEB_ORIGIN.includes(origin)) {
      reply.raw.setHeader("Access-Control-Allow-Origin", origin);
      reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
      reply.raw.setHeader("Vary", "Origin");
    }
    await toNodeHandler(auth)(request.raw, reply.raw);
  });
};
