import type { FastifyReply, FastifyRequest } from "fastify";

export function requireSuperAdmin(req: FastifyRequest, reply: FastifyReply) {
  if (!req.auth?.isSuperAdmin) {
    reply.code(403).send({ message: "Acesso restrito ao administrador do sistema." });
    return false;
  }
  return true;
}
