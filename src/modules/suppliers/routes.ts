import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SuppliersService } from "./service";

const supplierCreateSchema = z.object({
  type: z.enum(["PJ", "PF"]),
  legal_name: z.string().min(2),
  trade_name: z.string().min(1).optional().nullable(),
  document: z.string().min(5),
  state_registration: z.string().min(1).optional().nullable(),
  notes: z.string().min(1).optional().nullable(),
});

const supplierUpdateSchema = z.object({
  type: z.enum(["PJ", "PF"]).optional(),
  legal_name: z.string().optional().refine(v => !v || v.length >= 2),
  trade_name: z.string().optional().nullable(),
  document: z.string().optional().refine(v => !v || v.length >= 5),
  state_registration: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const supplierAddressSchema = z.object({
  zip_code: z.string().min(3).optional().nullable(),
  street: z.string().min(1).optional().nullable(),
  number: z.string().min(1).optional().nullable(),
  district: z.string().min(1).optional().nullable(),
  city: z.string().min(1).optional().nullable(),
  state: z.string().min(1).optional().nullable(),
  complement: z.string().min(1).optional().nullable(),
});

const supplierContactSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(3).optional().nullable(),
  email: z.string().email().optional().nullable(),
  role: z.string().min(1).optional().nullable(),
});

export async function suppliersRoutes(app: FastifyInstance) {
  const service = new SuppliersService();

  // LIST
  app.get("/suppliers", async (req) => {
    return service.list(req.auth!.activeTenantId);
  });

  // GET BY ID (com endereço + contatos)
  app.get("/suppliers/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const supplier = await service.getById(req.auth!.activeTenantId, id);
    if (!supplier) return reply.code(404).send({ message: "Supplier not found" });
    return supplier;
  });

  // CREATE (idempotente por document)
  // - se criou: 201 { created: true, supplier: {...} }
  // - se já existia: 200 { created: false, supplier: {...} }
  app.post("/suppliers", async (req, reply) => {
    const body = supplierCreateSchema.parse(req.body);
    const result = await service.create(req.auth!.activeTenantId, body);

    if (result.created) {
      return reply.code(201).send(result);
    }

    return reply.code(200).send(result);
  });

  // UPDATE
  app.put("/suppliers/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = supplierUpdateSchema.parse(req.body);

    const updated = await service.update(req.auth!.activeTenantId, id, body);
    if (!updated) return reply.code(404).send({ message: "Supplier not found" });

    return updated;
  });

  // ADD ADDRESS
  app.post("/suppliers/:id/address", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = supplierAddressSchema.parse(req.body);

    const address = await service.addAddress(req.auth!.activeTenantId, id, body);
    return reply.code(201).send(address);
  });

  // ADD CONTACT
  app.post("/suppliers/:id/contacts", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = supplierContactSchema.parse(req.body);

    const contact = await service.addContact(req.auth!.activeTenantId, id, body);
    return reply.code(201).send(contact);
  });

  // DELETE
  app.delete("/suppliers/:id", async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return service.delete(req.auth!.activeTenantId, id);
  });
}
