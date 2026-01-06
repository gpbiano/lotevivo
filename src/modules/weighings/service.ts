import type { FastifyInstance } from "fastify";
import { animalsService } from "@/modules/animals/service";

type BatchItemInput = { animalId: string; weightKg: number };

type BatchError = { animal_id: string; message: string };

export function weighingsService(app: FastifyInstance) {
  const animals = animalsService(app);

  async function createBatch(params: {
    tenantId: string;
    weighedAt: string;
    items: BatchItemInput[];
    notes?: string | null;
    createdBy?: string | null;
  }) {
    const { tenantId, weighedAt, items, notes, createdBy } = params;

    const results: any[] = [];
    const errors: BatchError[] = [];

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

        // ✅ pega só o item (pesagem) para retornar limpo no batch
        results.push(created.item);
      } catch (e: any) {
        errors.push({ animal_id: it.animalId, message: e?.message ?? "Erro" });
      }
    }

    return {
      created: results.length,
      failed: errors.length,
      errors,
      items: results,
    };
  }

  return { createBatch };
}
