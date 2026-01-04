import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { LocationsService } from "./service";

const locationCreateSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["GALPAO", "PASTO", "ESTABULO", "PIQUETE", "INCUBADORA", "MATERNIDADE", "OUTRO"]),
  notes: z.string().min(1).optional().nullable(),
});

const locationUpdateSchema = z.object({
  name: z.string().optional().refine((v) => !v || v.length >= 2),
  type: z.enum(["GALPAO", "PASTO", "ESTABULO", "PIQUETE", "INCUBADORA", "MATERNIDADE", "OUTRO"]).optional(),
  notes: z.string().optional().nullable(),
});

export async function locationsRoutes(app: FastifyInstance) {
  const service = new LocationsService();

  app.get("/locations", async (req) => {
    return service.list(req.auth!.activeTenantId);
  });

  app.get("/locations/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const location = await service.getById(req.auth!.activeTenantId, id);
    if (!location) return reply.code(404).send({ message: "Location not found" });
    return location;
  });

  // CREATE idempotente por name
  app.post("/locations", async (req, reply) => {
    const body = locationCreateSchema.parse(req.body);
    const result = await service.create(req.auth!.activeTenantId, body);

    if (result.created) return reply.code(201).send(result);
    return reply.code(200).send(result);
  });

  app.put("/locations/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = locationUpdateSchema.parse(req.body);

    const updated = await service.update(req.auth!.activeTenantId, id, body);
    if (!updated) return reply.code(404).send({ message: "Location not found" });
    return updated;
  });

  app.delete("/locations/:id", async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return service.delete(req.auth!.activeTenantId, id);
  });
}
