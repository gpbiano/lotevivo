import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { productionStagesService } from "./service";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function productionStagesRoutes(app: FastifyInstance) {
  const svc = productionStagesService(app);

  /**
   * =========================
   * KANBAN (COLUNAS + LOTES)
   * =========================
   */
  app.get(
    "/production/kanban",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const auth = req.auth!;
      const qs = z
        .object({
          chain: z.string().min(1),
          purpose: z.string().min(1).optional(),
        })
        .parse(req.query);

      const result = await svc.getProductionKanban(auth, {
        chain: qs.chain,
        purpose: qs.purpose ?? undefined,
      });

      return reply.send(result);
    }
  );

  /**
   * =========================
   * LISTAR ESTÁGIOS
   * =========================
   */
  app.get(
    "/production/stages",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const auth = req.auth!;
      const qs = z
        .object({
          chain: z.string().min(1),
          purpose: z.string().min(1).optional(),
        })
        .parse(req.query);

      const result = await svc.listStages(auth, {
        chain: qs.chain,
        purpose: qs.purpose ?? undefined,
      });

      return reply.send(result);
    }
  );

  /**
   * =========================
   * CRIAR ESTÁGIO
   * =========================
   */
  app.post(
    "/production/stages",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const auth = req.auth!;
      const body = z
        .object({
          chain: z.string().min(1),
          purpose: z.string().min(1).nullable().optional(),
          name: z.string().min(1),
          code: z.string().min(1),
          sortOrder: z.number().int().optional(),
          isTerminal: z.boolean().optional(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);

      const result = await svc.createStage(auth, body);
      return reply.code(201).send(result);
    }
  );

  /**
   * =========================
   * ATUALIZAR ESTÁGIO
   * =========================
   */
  app.patch(
    "/production/stages/:id",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const auth = req.auth!;
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

      const body = z
        .object({
          name: z.string().min(1).optional(),
          sortOrder: z.number().int().optional(),
          isTerminal: z.boolean().optional(),
          isActive: z.boolean().optional(),
          purpose: z.string().min(1).nullable().optional(),
        })
        .parse(req.body);

      const result = await svc.updateStage(auth, id, body);
      return reply.send(result);
    }
  );

  /**
   * =========================
   * MOVER LOTE PARA ESTÁGIO
   * =========================
   */
  app.post(
    "/lots/:id/stage",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const auth = req.auth!;
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

      const body = z
        .object({
          toStageId: z.string().uuid(),
          eventDate: dateSchema,
          notes: z.string().nullable().optional(),
          // ✅ compatível com sua versão do Zod
          meta: z.record(z.string(), z.any()).optional(),
        })
        .parse(req.body);

      const result = await svc.moveLotToStage(auth, id, body);
      return reply.send(result);
    }
  );

  /**
   * =========================
   * HISTÓRICO DE EVENTOS DO LOTE
   * =========================
   */
  app.get(
    "/lots/:id/stage-events",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const auth = req.auth!;
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

      const result = await svc.listLotStageEvents(auth, id);
      return reply.send(result);
    }
  );
}
