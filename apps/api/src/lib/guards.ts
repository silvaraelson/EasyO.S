import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@easy-os/schemas";
import { getRequestSession } from "./session.js";

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const session = await getRequestSession(request);
  if (!session) {
    return reply.code(401).send({ message: "Não autenticado" });
  }
  request.currentUser = session.user as unknown as {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;

    if (!request.currentUser || !roles.includes(request.currentUser.role)) {
      return reply.code(403).send({ message: "Sem permissão para essa ação" });
    }
  };
}
