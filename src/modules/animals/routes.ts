import { FastifyInstance } from "fastify";
import { z } from "zod";
import { animalsService } from "./service";

export async function animalsRoutes(app: FastifyInstance) {
  const svc = animalsService(app);

  const getTenantId = (req: any) => req.auth?.activeTenantId as string;
  const getUserId = (req: any) => (req.auth?.userId as string) ?? null;

  app.get("/animals", async (req: any) => {
    const querySchema = z.object({
      lotId: z.string().uuid().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.coerce.number().min(1).max(500).optional(),
    });

    const { lotId, status, search, limit } = querySchema.parse(req.query);
    const tenantId = getTenantId(req);

    const items = await svc.listAnimals({ tenantId, lotId, status, search, limit });
    return { items };
  });

  app.get("/animals/:id", async (req: any) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(req.params);

    const tenantId = getTenantId(req);
    return svc.getAnimalById(tenantId, id);
  });

  app.get("/animals/:id/weighings", async (req: any) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const querySchema = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.coerce.number().min(1).max(200).optional(),
    });

    const { id } = paramsSchema.parse(req.params);
    const { from, to, limit } = querySchema.parse(req.query);

    const tenantId = getTenantId(req);
    const items = await svc.listWeighings({ tenantId, animalId: id, from, to, limit });

    return { animal_id: id, items };
  });

  app.get("/animals/:id/weighings/series", async (req: any) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const querySchema = z.object({ from: z.string().optional(), to: z.string().optional() });

    const { id } = paramsSchema.parse(req.params);
    const { from, to } = querySchema.parse(req.query);

    const tenantId = getTenantId(req);
    return svc.getWeighingsSeries({ tenantId, animalId: id, from, to });
  });

  app.post("/animals/:id/weighings", async (req: any, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      weighed_at: z.string(),
      weight_kg: z.number().positive(),
      notes: z.string().optional().nullable(),
    });

    const { id } = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);

    const tenantId = getTenantId(req);
    const createdBy = getUserId(req);

    try {
      const created = await svc.createWeighingWithGmd({
        tenantId,
        animalId: id,
        weighedAt: body.weighed_at,
        weightKg: body.weight_kg,
        notes: body.notes ?? null,
        createdBy,
      });

      return reply.code(201).send(created);
    } catch (e: any) {
      return reply.code(e?.statusCode ?? 500).send({
        message: e?.message ?? "Erro ao criar pesagem",
      });
    }
  });
}
