import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { LotsService } from "./service";

const lotCreateSchema = z.object({
  code: z.string().min(2),
  lot_type: z.enum(["MATRIZES", "INCUBACAO", "VIVO", "REBANHO_CORTE", "REBANHO_LEITE", "REBANHO_MISTO"]),
  name: z.string().min(2),
  species: z.string().min(2),
  purpose: z.string().min(2),
  breed: z.string().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  start_date: z.string().min(10),
  status: z.string().min(2),
  notes: z.string().optional().nullable(),
});

export async function lotsRoutes(app: FastifyInstance) {
  const service = new LotsService();

  app.get("/lots", async (req) => {
    return service.list(req.auth!.activeTenantId);
  });

  app.get("/lots/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const lot = await service.getById(req.auth!.activeTenantId, id);
    if (!lot) return reply.code(404).send({ message: "Lot not found" });
    return lot;
  });

  app.post("/lots", async (req, reply) => {
    const body = lotCreateSchema.parse(req.body);
    const result = await service.create(req.auth!.activeTenantId, body);

    if (result.created) return reply.code(201).send(result);
    return reply.code(200).send(result);
  });
}
