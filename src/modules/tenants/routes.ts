import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { tenantsService } from "./service";
import { requireSuperAdmin } from "../../shared/requireSuperAdmin";

export async function tenantsRoutes(app: FastifyInstance) {
  const svc = tenantsService(app);

  // LISTAR EMPRESAS (SÓ SUPER ADMIN)
  app.get("/admin/tenants", async (req, reply) => {
    if (!requireSuperAdmin(req, reply)) return;

    const q = (req.query as any) ?? {};
    const items = await svc.listTenants({ limit: q.limit, search: q.search });

    return { items };
  });

  // STATUS (SÓ SUPER ADMIN)
  app.patch("/admin/tenants/:id/status", async (req, reply) => {
    if (!requireSuperAdmin(req, reply)) return;

    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({ is_active: z.boolean() });

    const { id } = paramsSchema.parse(req.params);
    const { is_active } = bodySchema.parse(req.body);

    await svc.setTenantStatus({ tenantId: id, isActive: is_active });
    return { ok: true };
  });

  // ==========================
  // USERS DO TENANT (SÓ SUPER ADMIN)
  // ==========================

  app.get("/admin/tenants/:id/users", async (req, reply) => {
    if (!requireSuperAdmin(req, reply)) return;

    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(req.params);

    const items = await svc.listTenantUsersAdmin(id);
    return { items };
  });

  app.post("/admin/tenants/:id/users", async (req, reply) => {
    if (!requireSuperAdmin(req, reply)) return;

    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      email: z.string().email(),
      role: z.enum(["ADMIN", "OPERATOR", "CONSULTANT"]),
    });

    const { id } = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);

    const res = await svc.addUserToTenantByEmailAdmin({
      tenantId: id,
      email: body.email,
      role: body.role,
    });

    return reply.code(201).send(res);
  });

  app.patch("/admin/tenants/:id/users/:userId/role", async (req, reply) => {
    if (!requireSuperAdmin(req, reply)) return;

    const paramsSchema = z.object({
      id: z.string().uuid(),
      userId: z.string().uuid(),
    });

    const bodySchema = z.object({
      role: z.enum(["ADMIN", "OPERATOR", "CONSULTANT"]),
    });

    const { id, userId } = paramsSchema.parse(req.params);
    const { role } = bodySchema.parse(req.body);

    const res = await svc.updateUserRoleAdmin({ tenantId: id, userId, role });
    return res;
  });

  app.delete("/admin/tenants/:id/users/:userId", async (req, reply) => {
    if (!requireSuperAdmin(req, reply)) return;

    const paramsSchema = z.object({
      id: z.string().uuid(),
      userId: z.string().uuid(),
    });

    const { id, userId } = paramsSchema.parse(req.params);

    const res = await svc.removeUserFromTenantAdmin({ tenantId: id, userId });
    return res;
  });
}
