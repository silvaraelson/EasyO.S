import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/client.js";
import { env } from "./env.js";

/**
 * Papéis (`role`) e `team` são campos customizados no schema `user` —
 * ver apps/api/src/db/schema.ts. Sem plugin de organização por enquanto:
 * o plano trata multi-tenant como decisão adiada (single-tenant no MVP).
 */
export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [...env.WEB_ORIGIN, "easyos://"],
  plugins: [expo()],
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      // As colunas `id` são uuid com defaultRandom() (ver schema.ts) — deixa o
      // Postgres gerar o UUID em vez do Better Auth gerar um id não-UUID.
      generateId: false,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "attendant",
        input: false, // definido por um admin, não pelo próprio usuário no signup
      },
      team: {
        type: "string",
        required: false,
      },
      active: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
