import Fastify from "fastify";
import cors from "@fastify/cors";
import authPlugin from "./plugins/auth";

import { meRoutes } from "./modules/me/routes";
import { tenantsRoutes } from "./modules/tenants/routes";
import { suppliersRoutes } from "./modules/suppliers/routes";
import { locationsRoutes } from "./modules/locations/routes";
import { lotsRoutes } from "./modules/lots/routes";
import { movementsRoutes } from "./modules/movements/routes";
import { dashboardRoutes } from "./modules/dashboard/routes";
import { tenantProfileRoutes } from "./modules/tenant-profile/routes";

import { animalsRoutes } from "./modules/animals/routes";
import { weighingsRoutes } from "./modules/weighings/routes";

export async function buildApp() {
  const app = Fastify({ logger: true });

  // ✅ CORS (corrige preflight + Authorization)
  await app.register(cors, {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // ✅ auth (com liberação de OPTIONS lá dentro)
  await app.register(authPlugin);

  // rota pública
  app.get("/health", { config: { public: true } }, async () => ({ ok: true }));

  // rotas autenticadas
  await app.register(meRoutes);
  await app.register(tenantsRoutes);
  await app.register(suppliersRoutes);
  await app.register(locationsRoutes);
  await app.register(lotsRoutes);
  await app.register(movementsRoutes);
  await app.register(dashboardRoutes);
  await app.register(tenantProfileRoutes);

  // novas rotas
  await app.register(animalsRoutes);
  await app.register(weighingsRoutes);

  return app;
}
