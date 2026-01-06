import type { FastifyInstance } from "fastify";
import { customersService } from "./service";

export async function customersRoutes(app: FastifyInstance) {
  const svc = customersService(app);

  // LISTA
  app.get("/customers", async (req, reply) => {
    const auth = (req as any).auth;
    const tenantId = auth?.activeTenantId as string | undefined;

    if (!tenantId) return reply.code(401).send({ message: "Não autenticado." });

    const q = (req.query as any) ?? {};

    // Aceita os dois formatos: is_active e isActive
    const isActive = q.is_active ?? q.isActive;

    const items = await svc.listCustomers({
      tenantId,
      search: q.search,
      isActive,
      limit: q.limit,
    });

    return { items };
  });

  // CRIAR
  app.post("/customers", async (req, reply) => {
    const auth = (req as any).auth;
    const tenantId = auth?.activeTenantId as string | undefined;

    if (!tenantId) return reply.code(401).send({ message: "Não autenticado." });

    const body = (req.body as any) ?? {};

    if (!body?.name || String(body.name).trim().length < 2) {
      return reply.code(400).send({ message: "Nome do cliente é obrigatório." });
    }

    const item = await svc.createCustomer({
      tenantId,
      type: body.type ?? "PJ",
      name: String(body.name).trim(),
      trade_name: body.trade_name ?? null,
      document: body.document ?? null,
      state_registration: body.state_registration ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
      is_active: body.is_active ?? true,
    });

    return reply.code(201).send({ item });
  });

  // DETALHE
  app.get("/customers/:id", async (req, reply) => {
    const auth = (req as any).auth;
    const tenantId = auth?.activeTenantId as string | undefined;

    if (!tenantId) return reply.code(401).send({ message: "Não autenticado." });

    const { id } = req.params as any;

    const item = await svc.getCustomerById({
      tenantId,
      customerId: id,
    });

    return { item };
  });

  // EDITAR (PUT)
  app.put("/customers/:id", async (req, reply) => {
    const auth = (req as any).auth;
    const tenantId = auth?.activeTenantId as string | undefined;

    if (!tenantId) return reply.code(401).send({ message: "Não autenticado." });

    const { id } = req.params as any;
    const body = (req.body as any) ?? {};

    if (body?.name !== undefined && String(body.name).trim().length < 2) {
      return reply.code(400).send({ message: "Nome do cliente inválido." });
    }

    const item = await svc.updateCustomer({
      tenantId,
      customerId: id,
      type: body.type,
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      trade_name: body.trade_name,
      document: body.document,
      state_registration: body.state_registration,
      email: body.email,
      phone: body.phone,
      notes: body.notes,
      is_active: body.is_active,
    });

    return { item };
  });

  // -------------------
  // CONTATOS DO CLIENTE
  // -------------------
  app.get("/customers/:id/contacts", async (req, reply) => {
    const auth = (req as any).auth;
    const tenantId = auth?.activeTenantId as string | undefined;

    if (!tenantId) return reply.code(401).send({ message: "Não autenticado." });

    const { id } = req.params as any;
    const q = (req.query as any) ?? {};

    const items = await svc.listCustomerContacts({
      tenantId,
      customerId: id,
      limit: q.limit,
    });

    return { items };
  });

  app.post("/customers/:id/contacts", async (req, reply) => {
    const auth = (req as any).auth;
    const tenantId = auth?.activeTenantId as string | undefined;

    if (!tenantId) return reply.code(401).send({ message: "Não autenticado." });

    const { id } = req.params as any;
    const body = (req.body as any) ?? {};

    const item = await svc.createCustomerContact({
      tenantId,
      customerId: id,
      name: body.name ?? null,
      role: body.role ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
    });

    return reply.code(201).send({ item });
  });

  // -------------------
  // ENDEREÇOS DO CLIENTE
  // -------------------
  app.get("/customers/:id/addresses", async (req, reply) => {
    const auth = (req as any).auth;
    const tenantId = auth?.activeTenantId as string | undefined;

    if (!tenantId) return reply.code(401).send({ message: "Não autenticado." });

    const { id } = req.params as any;
    const q = (req.query as any) ?? {};

    const items = await svc.listCustomerAddresses({
      tenantId,
      customerId: id,
      limit: q.limit,
    });

    return { items };
  });

  app.post("/customers/:id/addresses", async (req, reply) => {
    const auth = (req as any).auth;
    const tenantId = auth?.activeTenantId as string | undefined;

    if (!tenantId) return reply.code(401).send({ message: "Não autenticado." });

    const { id } = req.params as any;
    const body = (req.body as any) ?? {};

    const item = await svc.createCustomerAddress({
      tenantId,
      customerId: id,
      label: body.label ?? null,
      zip_code: body.zip_code ?? null,
      street: body.street ?? null,
      number: body.number ?? null,
      complement: body.complement ?? null,
      neighborhood: body.neighborhood ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      country: body.country ?? null,
    });

    return reply.code(201).send({ item });
  });
}
