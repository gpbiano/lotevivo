import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { animalsService } from "./service";

export async function animalsRoutes(app: FastifyInstance) {
  const svc = animalsService(app);

  const getTenantId = (req: any) => req.auth?.activeTenantId as string | undefined;
  const getUserId = (req: any) => (req.auth?.userId as string) ?? null;

  function badRequest(reply: any, message: string) {
    return reply.code(400).send({ message });
  }

  function unauthorized(reply: any) {
    return reply.code(401).send({ message: "Não autenticado." });
  }

  function notFound(reply: any, message: string) {
    return reply.code(404).send({ message });
  }

  function serverError(reply: any, e: any, fallback = "Erro interno do servidor.") {
    return reply.code(e?.statusCode ?? 500).send({ message: e?.message ?? fallback });
  }

  /* =========================
     LISTAGEM DE ANIMAIS
  ========================= */
  app.get("/animals", async (req: any, reply) => {
    const tenantId = getTenantId(req);
    if (!tenantId) return unauthorized(reply);

    const querySchema = z.object({
      lotId: z.string().uuid().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.coerce.number().min(1).max(500).optional(),
    });

    try {
      const { lotId, status, search, limit } = querySchema.parse(req.query);

      const items = await svc.listAnimals({
        tenantId,
        lotId,
        status,
        search,
        limit,
      });

      return { items };
    } catch (e: any) {
      return serverError(reply, e, "Erro ao listar animais.");
    }
  });

  /* =========================
     DETALHE DO ANIMAL
  ========================= */
  app.get("/animals/:id", async (req: any, reply) => {
    const tenantId = getTenantId(req);
    if (!tenantId) return unauthorized(reply);

    const paramsSchema = z.object({ id: z.string().uuid() });

    try {
      const { id } = paramsSchema.parse(req.params);
      const item = await svc.getAnimalById(tenantId, id);
      return { item };
    } catch (e: any) {
      return serverError(reply, e, "Erro ao carregar detalhes do animal.");
    }
  });

  /* =========================
     CRIAR ANIMAL
  ========================= */
  app.post("/animals", async (req: any, reply) => {
    const tenantId = getTenantId(req);
    if (!tenantId) return unauthorized(reply);

    const bodySchema = z.object({
      tag_id: z.string().optional().nullable(),
      name: z.string().optional().nullable(),
      species: z.string().min(1),
      sex: z.enum(["male", "female"]),
      breed: z.string().optional().nullable(),
      birth_date: z.string().optional().nullable(),
      origin_type: z.string().optional().nullable(), // default no service ("born")
      supplier_id: z.string().uuid().optional().nullable(),
      supplier_name: z.string().optional().nullable(),
      status: z.string().optional().nullable(), // default no service ("active")
      current_lot_id: z.string().uuid().optional().nullable(),
      current_location_id: z.string().uuid().optional().nullable(),
      notes: z.string().optional().nullable(),
    });

    try {
      const body = bodySchema.parse(req.body);

      const tagOk = !!(body.tag_id && String(body.tag_id).trim().length);
      const nameOk = !!(body.name && String(body.name).trim().length);

      if (!tagOk && !nameOk) {
        return badRequest(reply, "Informe pelo menos o brinco/identificação ou o nome do animal.");
      }

      const item = await svc.createAnimal({
        tenantId,
        tag_id: body.tag_id ? String(body.tag_id).trim() : null,
        name: body.name ? String(body.name).trim() : null,
        species: body.species,
        sex: body.sex,
        breed: body.breed ? String(body.breed).trim() : null,
        birth_date: body.birth_date ? String(body.birth_date).trim() : null,
        origin_type: body.origin_type ? String(body.origin_type).trim() : undefined,
        supplier_id: body.supplier_id ?? null,
        supplier_name: body.supplier_name ? String(body.supplier_name).trim() : null,
        status: body.status ? String(body.status).trim() : undefined,
        current_lot_id: body.current_lot_id ?? null,
        current_location_id: body.current_location_id ?? null,
        notes: body.notes ? String(body.notes).trim() : null,
      });

      return reply.code(201).send({ item });
    } catch (e: any) {
      return serverError(reply, e, "Erro ao cadastrar animal.");
    }
  });

  /* =========================
     PESAGENS DO ANIMAL
  ========================= */
  app.get("/animals/:id/weighings", async (req: any, reply) => {
    const tenantId = getTenantId(req);
    if (!tenantId) return unauthorized(reply);

    const paramsSchema = z.object({ id: z.string().uuid() });
    const querySchema = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.coerce.number().min(1).max(200).optional(),
    });

    try {
      const { id } = paramsSchema.parse(req.params);
      const { from, to, limit } = querySchema.parse(req.query);

      const items = await svc.listWeighings({
        tenantId,
        animalId: id,
        from,
        to,
        limit,
      });

      return { animal_id: id, items };
    } catch (e: any) {
      return serverError(reply, e, "Erro ao listar pesagens do animal.");
    }
  });

  app.get("/animals/:id/weighings/series", async (req: any, reply) => {
    const tenantId = getTenantId(req);
    if (!tenantId) return unauthorized(reply);

    const paramsSchema = z.object({ id: z.string().uuid() });
    const querySchema = z.object({ from: z.string().optional(), to: z.string().optional() });

    try {
      const { id } = paramsSchema.parse(req.params);
      const { from, to } = querySchema.parse(req.query);

      const series = await svc.getWeighingsSeries({
        tenantId,
        animalId: id,
        from,
        to,
      });

      return series;
    } catch (e: any) {
      return serverError(reply, e, "Erro ao gerar série de pesagens.");
    }
  });

  app.post("/animals/:id/weighings", async (req: any, reply) => {
    const tenantId = getTenantId(req);
    if (!tenantId) return unauthorized(reply);

    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      weighed_at: z.string().min(1),
      weight_kg: z.number().positive(),
      notes: z.string().optional().nullable(),
    });

    try {
      const { id } = paramsSchema.parse(req.params);
      const body = bodySchema.parse(req.body);
      const createdBy = getUserId(req);

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
      return serverError(reply, e, "Erro ao registrar pesagem.");
    }
  });

  /* =========================
     FOTO DO ANIMAL
  ========================= */

  // Upload da foto (multipart/form-data)
  app.post("/animals/:id/photo", async (req: any, reply) => {
    const tenantId = getTenantId(req);
    if (!tenantId) return unauthorized(reply);

    const paramsSchema = z.object({ id: z.string().uuid() });

    try {
      const { id } = paramsSchema.parse(req.params);

      if (!req.isMultipart || !req.isMultipart()) {
        return badRequest(reply, "Envio de arquivo inválido (esperado multipart/form-data).");
      }

      const file = await req.file();
      if (!file) return badRequest(reply, "Arquivo não enviado.");

      const buffer = await file.toBuffer();
      const fileName = file.filename || "foto.jpg";
      const contentType = file.mimetype || "image/jpeg";

      const uploaded = await svc.uploadAnimalPhoto({
        tenantId,
        animalId: id,
        fileBuffer: buffer,
        fileName,
        contentType,
      });

      // uploaded = { path }
      return reply.code(200).send({ item: uploaded });
    } catch (e: any) {
      return serverError(reply, e, "Erro ao enviar foto do animal.");
    }
  });

  // Retorna uma URL assinada da foto salva no animal (coluna photo_path)
  app.get("/animals/:id/photo-url", async (req: any, reply) => {
    const tenantId = getTenantId(req);
    if (!tenantId) return unauthorized(reply);

    const paramsSchema = z.object({ id: z.string().uuid() });
    const querySchema = z.object({
      expires: z.coerce.number().min(60).max(60 * 60 * 24).optional(), // 1 min até 24h
    });

    try {
      const { id } = paramsSchema.parse(req.params);
      const { expires } = querySchema.parse(req.query);

      const animal = await svc.getAnimalById(tenantId, id);
      const photoPath = (animal as any)?.photo_path as string | null | undefined;

      if (!photoPath) {
        return notFound(reply, "Este animal ainda não possui foto cadastrada.");
      }

      const { signedUrl } = await svc.getAnimalPhotoSignedUrl({
        path: photoPath,
        expiresInSeconds: expires ?? 3600,
      });

      return { url: signedUrl };
    } catch (e: any) {
      return serverError(reply, e, "Erro ao gerar link da foto do animal.");
    }
  });
}
