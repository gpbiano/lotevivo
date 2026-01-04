import type { FastifyInstance } from "fastify";
import { DashboardService } from "./service";

export async function dashboardRoutes(app: FastifyInstance) {
  const service = new DashboardService();

  app.get("/dashboard/overview", async (req) => {
    return service.overview(req.auth!.activeTenantId);
  });
}
