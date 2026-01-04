import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { TenantsService } from "./service";

export async function tenantsRoutes(app: FastifyInstance) {
  const service = new TenantsService();

  app.get("/tenants", async (req) => {
    const userId = req.auth!.userId;

    const [items, activeTenantId] = await Promise.all([
      service.listForUser(userId),
      service.getActiveTenantId(userId),
    ]);

    return { activeTenantId, items };
  });

  app.post("/tenants/:tenantId/select", async (req) => {
    const { tenantId } = z.object({ tenantId: z.string().uuid() }).parse(req.params);
    return service.selectActiveTenant(req.auth!.userId, tenantId);
  });
}
