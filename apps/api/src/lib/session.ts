import type { FastifyRequest } from "fastify";
import type { UserRole } from "@easy-os/schemas";
import { auth } from "../auth.js";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: CurrentUser;
  }
}

export async function getRequestSession(request: FastifyRequest) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  return auth.api.getSession({ headers });
}
