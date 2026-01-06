import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { createClient } from "@supabase/supabase-js";

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
import { customersRoutes } from "./modules/customers/routes";
import { eggProductionRoutes } from "./modules/egg-production/routes";
import { incubationsRoutes } from "./modules/incubations/routes";
import { incubationCyclesRoutes } from "./modules/incubation-cycles/routes";

export async function buildApp() {
  const app = Fastify({ logger: true });

  // ✅ CORS
  await app.register(cors, {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // ✅ multipart (REGISTRAR UMA ÚNICA VEZ AQUI)
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  });

  // ✅ Supabase (decorado no app)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    app.log.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no backend.");
    throw new Error("Configuração do Supabase ausente no backend.");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  app.decorate("supabase", supabase);

  // ✅ auth
  await app.register(authPlugin);

  // rota pública
  app.get("/health", { config: { public: true } }, async () => ({ ok: true }));

  // rotas
  await app.register(meRoutes);
  await app.register(tenantsRoutes);
  await app.register(suppliersRoutes);
  await app.register(locationsRoutes);
  await app.register(lotsRoutes);
  await app.register(movementsRoutes);
  await app.register(dashboardRoutes);
  await app.register(tenantProfileRoutes);

  await app.register(animalsRoutes);
  await app.register(weighingsRoutes);
  await app.register(customersRoutes);
  await app.register(eggProductionRoutes);
  await app.register(incubationsRoutes);
  await app.register(incubationCyclesRoutes);

  return app;
}
