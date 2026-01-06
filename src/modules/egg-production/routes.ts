import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createEggProduction,
  getEggProductionById,
  listEggProduction,
  updateEggProduction,
} from "./service";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function eggProductionRoutes(app: FastifyInstance) {
  // LIST
  app.get("/egg-production", async (req) => {
    const auth = req.auth!;
    const querySchema = z.object({
      lotId: z.string().uuid().optional(),
      locationId: z.string().uuid().optional(),
      mode: z.string().optional(),
      dateFrom: dateSchema.optional(),
      dateTo: dateSchema.optional(),
    });

    const q = querySchema.parse(req.query);
    return listEggProduction(auth, q);
  });

  // GET BY ID
  app.get("/egg-production/:id", async (req) => {
    const auth = req.auth!;
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(req.params);
    return getEggProductionById(auth, id);
  });

  // CREATE
  app.post("/egg-production", async (req) => {
    const auth = req.auth!;
    const bodySchema = z.object({
      productionDate: dateSchema,
      mode: z.string(), // egg_production_mode (enum no banco)
      lotId: z.string().uuid(),
      locationId: z.string().uuid().nullable().optional(),

      qtyEggs: z.number().int().positive(),
      qtyViable: z.number().int().nonnegative().nullable().optional(),
      qtyDamaged: z.number().int().nonnegative().nullable().optional(),
      qtyForIncubation: z.number().int().nonnegative().nullable().optional(),

      notes: z.string().nullable().optional(),
    });

    const body = bodySchema.parse(req.body);
    return createEggProduction(auth, body);
  });

  // UPDATE
  app.put("/egg-production/:id", async (req) => {
    const auth = req.auth!;
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      productionDate: dateSchema.optional(),
      mode: z.string().optional(),
      locationId: z.string().uuid().nullable().optional(),

      qtyEggs: z.number().int().positive().optional(),
      qtyViable: z.number().int().nonnegative().nullable().optional(),
      qtyDamaged: z.number().int().nonnegative().nullable().optional(),
      qtyForIncubation: z.number().int().nonnegative().nullable().optional(),

      notes: z.string().nullable().optional(),
    });

    const { id } = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);
    return updateEggProduction(auth, id, body);
  });
}
