import type { FastifyInstance } from "fastify";

export async function meRoutes(app: FastifyInstance) {
  app.get("/me", async (req) => {
    return {
      userId: req.auth!.userId,
      email: req.auth!.email ?? null,
      role: req.auth!.role,
      activeTenantId: req.auth!.activeTenantId,
    };
  });
}
