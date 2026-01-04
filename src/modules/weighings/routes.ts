import { FastifyInstance } from "fastify";
import { z } from "zod";
import { animalsService } from "../animals/service";

export async function weighingsRoutes(app: FastifyInstance) {
  const animals = animalsService(app);

  const getTenantId = (req: any) => req.auth?.activeTenantId as string;
  const getUserId = (req: any) => (req.auth?.userId as string) ?? null;

  app.post("/weighings/batch", async (req: any, reply) => {
    const bodySchema = z.object({
      weighed_at: z.string(),
      notes: z.string().optional().nullable(),
      items: z
        .array(
          z.object({
            animal_id: z.string().uuid(),
            weight_kg: z.number().positive(),
          })
        )
        .min(1),
    });

    const body = bodySchema.parse(req.body);
    const tenantId = getTenantId(req);
    const createdBy = getUserId(req);

    const created: any[] = [];
    const errors: Array<{ animal_id: string; message: string }> = [];

    for (const it of body.items) {
      try {
        const r = await animals.createWeighingWithGmd({
          tenantId,
          animalId: it.animal_id,
          weighedAt: body.weighed_at,
          weightKg: it.weight_kg,
          notes: body.notes ?? null,
          createdBy,
        });
        created.push(r);
      } catch (e: any) {
        errors.push({ animal_id: it.animal_id, message: e?.message ?? "Erro" });
      }
    }

    return reply.code(201).send({ created: created.length, errors, items: created });
  });
}
