import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createIncubationCycle,
  getIncubationCycleById,
  listIncubationCycles,
  updateIncubationCycle,
  updateIncubationCycleStatus,
} from "./service";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function incubationCyclesRoutes(app: FastifyInstance) {
  // LIST
  app.get("/incubation-cycles", async (req) => {
    const auth = req.auth!;
    const querySchema = z.object({
      status: z.string().optional(),
      incubationLotId: z.string().uuid().optional(),
      dateFrom: dateSchema.optional(),
      dateTo: dateSchema.optional(),
      q: z.string().optional(),
    });

    const q = querySchema.parse(req.query);
    return listIncubationCycles(auth, q);
  });

  // GET BY ID
  app.get("/incubation-cycles/:id", async (req) => {
    const auth = req.auth!;
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(req.params);
    return getIncubationCycleById(auth, id);
  });

  // CREATE
  app.post("/incubation-cycles", async (req) => {
    const auth = req.auth!;
    const bodySchema = z.object({
      incubationLotId: z.string().uuid(),

      sourceType: z.string(), // enum no banco, mas aqui deixo string pra não travar dev
      supplierId: z.string().uuid().nullable().optional(),
      sourceLotId: z.string().uuid().nullable().optional(),

      method: z.string(), // enum no banco
      startDate: dateSchema,
      eggsSetQty: z.number().int().positive(),
      expectedHatchDate: dateSchema,

      status: z.string().optional(),
    });

    const body = bodySchema.parse(req.body);
    return createIncubationCycle(auth, body);
  });

  // UPDATE (dados do ciclo)
  app.put("/incubation-cycles/:id", async (req) => {
    const auth = req.auth!;
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      method: z.string().optional(),
      startDate: dateSchema.optional(),
      eggsSetQty: z.number().int().positive().optional(),
      expectedHatchDate: dateSchema.optional(),
    });

    const { id } = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);
    return updateIncubationCycle(auth, id, body);
  });

  // UPDATE STATUS
  app.patch("/incubation-cycles/:id/status", async (req) => {
    const auth = req.auth!;
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      status: z.string(), // incubation_status enum
    });

    const { id } = paramsSchema.parse(req.params);
    const { status } = bodySchema.parse(req.body);
    return updateIncubationCycleStatus(auth, id, status);
  });
}
