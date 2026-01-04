import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { MovementsService } from "./service";

const movementTypeEnum = z.enum([
  "ENTRY_PURCHASE",
  "SALE",
  "DEATH",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "BIRTH",
  "CULL",
]);

const createMovementSchema = z.object({
  lot_id: z.string().uuid(),
  movement_type: movementTypeEnum,
  species: z.string().min(2), // ✅ obrigatório no seu DB
  qty: z.number().int().positive(),
  movement_date: z.string().min(10), // YYYY-MM-DD
  from_location_id: z.string().uuid().optional().nullable(),
  to_location_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function movementsRoutes(app: FastifyInstance) {
  const service = new MovementsService();

  app.get("/lots/:lotId/movements", async (req) => {
    const { lotId } = z.object({ lotId: z.string().uuid() }).parse(req.params);
    return service.listByLot(req.auth!.activeTenantId, lotId);
  });

  app.post("/movements", async (req, reply) => {
    const body = createMovementSchema.parse(req.body);
    const created = await service.create(req.auth!.activeTenantId, body);
    return reply.code(201).send(created);
  });

  app.get("/lots/:lotId/balance", async (req) => {
    const { lotId } = z.object({ lotId: z.string().uuid() }).parse(req.params);
    return service.getLotBalance(req.auth!.activeTenantId, lotId);
  });

  app.delete("/movements/:id", async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return service.delete(req.auth!.activeTenantId, id);
  });
}
