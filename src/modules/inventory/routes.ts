import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { inventoryService } from "./service";

export async function inventoryRoutes(app: FastifyInstance) {
  const inv = inventoryService(app);

  app.get("/inventory/balance", async (req) => {
    const auth = req.auth!;
    const querySchema = z.object({
      groupBy: z.enum(["lot", "lot_location"]).optional(),
    });

    const q = querySchema.parse(req.query);
    return inv.getBalance(auth as any, { groupBy: q.groupBy });
  });
}
