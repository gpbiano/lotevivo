// src/modules/me/routes.ts
import type { FastifyInstance } from "fastify";

export async function meRoutes(app: FastifyInstance) {
  app.get("/me", async (req) => {
    return {
      userId: req.auth!.userId,
      email: req.auth!.email ?? null,
      role: req.auth!.role,
      isSuperAdmin: req.auth!.isSuperAdmin,
      activeTenantId: req.auth!.activeTenantId,
    };
  });
}

