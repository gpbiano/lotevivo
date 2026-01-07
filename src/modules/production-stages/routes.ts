import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { productionStagesService } from "./service";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function sendError(reply: FastifyReply, err: any) {
  const status = err?.statusCode || err?.status || 500;
  const message =
    err?.message || (status === 500 ? "Erro interno do servidor" : "Erro");
  return reply.code(status).send({ message });
}

export async function productionStagesRoutes(app: FastifyInstance) {
  const svc = productionStagesService(app);

  /**
   * =========================
   * LISTAR ESTÁGIOS (KANBAN)
   * =========================
   */
  app.get(
    "/production/stages",
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const auth = (req as any).auth!;
        const qs = z
          .object({
            chain: z.string().min(1),
            purpose: z.string().min(1).optional(),
          })
          .parse((req as any).query);

        const result = await svc.listStages(auth, {
          chain: qs.chain,
          purpose: qs.purpose ?? undefined,
        });

        return reply.send(result);
      } catch (err: any) {
        req.log.error({ err }, "GET /production/stages failed");
        return sendError(reply, err);
      }
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
      try {
        const auth = (req as any).auth!;
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
          .parse((req as any).body);

        const result = await svc.createStage(auth, body);
        return reply.code(201).send(result);
      } catch (err: any) {
        req.log.error({ err }, "POST /production/stages failed");
        return sendError(reply, err);
      }
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
      try {
        const auth = (req as any).auth!;
        const { id } = z
          .object({ id: z.string().uuid() })
          .parse((req as any).params);

        const body = z
          .object({
            name: z.string().min(1).optional(),
            sortOrder: z.number().int().optional(),
            isTerminal: z.boolean().optional(),
            isActive: z.boolean().optional(),
            purpose: z.string().min(1).nullable().optional(),
          })
          .parse((req as any).body);

        const result = await svc.updateStage(auth, id, body);
        return reply.send(result);
      } catch (err: any) {
        req.log.error({ err }, "PATCH /production/stages/:id failed");
        return sendError(reply, err);
      }
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
      try {
        const auth = (req as any).auth!;
        const { id } = z
          .object({ id: z.string().uuid() })
          .parse((req as any).params);

        const body = z
          .object({
            toStageId: z.string().uuid(),
            eventDate: dateSchema,
            notes: z.string().nullable().optional(),
            // ✅ Zod do teu projeto exige key + value
            meta: z.record(z.string(), z.any()).optional(),
          })
          .parse((req as any).body);

        const result = await svc.moveLotToStage(auth, id, body);
        return reply.send(result);
      } catch (err: any) {
        req.log.error({ err }, "POST /lots/:id/stage failed");
        return sendError(reply, err);
      }
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
      try {
        const auth = (req as any).auth!;
        const { id } = z
          .object({ id: z.string().uuid() })
          .parse((req as any).params);

        const result = await svc.listLotStageEvents(auth, id);
        return reply.send(result);
      } catch (err: any) {
        req.log.error({ err }, "GET /lots/:id/stage-events failed");
        return sendError(reply, err);
      }
    }
  );
}
