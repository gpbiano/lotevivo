import { FastifyInstance } from "fastify";
import { animalsService } from "@/modules/animals/service";

export function weighingsService(app: FastifyInstance) {
  const animals = animalsService(app);

  async function createBatch(params: {
    tenantId: string;
    weighedAt: string;
    items: Array<{ animalId: string; weightKg: number }>;
    notes?: string | null;
    createdBy?: string | null;
  }) {
    const { tenantId, weighedAt, items, notes, createdBy } = params;

    const results: any[] = [];
    const errors: Array<{ animal_id: string; message: string }> = [];

    for (const it of items) {
      try {
        const created = await animals.createWeighingWithGmd({
          tenantId,
          animalId: it.animalId,
          weighedAt,
          weightKg: it.weightKg,
          notes,
          createdBy,
        });
        results.push(created);
      } catch (e: any) {
        errors.push({ animal_id: it.animalId, message: e?.message ?? "Erro" });
      }
    }

    return {
      created: results.length,
      errors,
      items: results,
    };
  }

  return { createBatch };
}
