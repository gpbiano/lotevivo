import { FastifyInstance } from "fastify";
import { z } from "zod";
import { addHatching, addIncubationBatch, addOvoscopy, createIncubation } from "./service";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function incubationsRoutes(app: FastifyInstance) {
  app.post("/incubations", async (req) => {
    const auth = req.auth!;
    const bodySchema = z.object({
      lotId: z.string().uuid(),
      incubationType: z.enum(["CHOCADORA", "GALINHA"]),
      startedAt: dateSchema,
      expectedHatchAt: dateSchema.nullable().optional(),
      notes: z.string().nullable().optional(),
    });

    const body = bodySchema.parse(req.body);
    return createIncubation(auth, body);
  });

  app.post("/incubations/:id/batches", async (req) => {
    const auth = req.auth!;
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      eggProductionId: z.string().uuid(),
      qtyEggsSet: z.number().int().positive(),
      setAt: dateSchema,
      notes: z.string().nullable().optional(),
    });

    const { id } = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);
    return addIncubationBatch(auth, id, body);
  });

  app.post("/incubations/:id/ovoscopy", async (req) => {
    const auth = req.auth!;
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      checkAt: dateSchema,
      qtyChecked: z.number().int().nonnegative(),
      qtyViable: z.number().int().nonnegative(),
      qtyInviable: z.number().int().nonnegative(),
      notes: z.string().nullable().optional(),
    });

    const { id } = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);

    // ✅ nome corrigido (ASCII puro)
    return addOvoscopy(auth, id, body);
  });

  app.post("/incubations/:id/hatching", async (req) => {
    const auth = req.auth!;
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      hatchAt: dateSchema,
      qtyHatched: z.number().int().nonnegative(),
      qtyChicksAlive: z.number().int().nonnegative(),
      qtyChicksDead: z.number().int().nonnegative(),
      notes: z.string().nullable().optional(),
    });

    const { id } = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);
    return addHatching(auth, id, body);
  });
}
