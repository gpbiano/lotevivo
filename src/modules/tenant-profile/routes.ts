import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { TenantProfileService } from "./service";
import { tenantProfileUpsertSchema } from "./schemas";

export async function tenantProfileRoutes(app: FastifyInstance) {
  const service = new TenantProfileService();

  /* =========================
     GET – PERFIL DO PRODUTOR
     (dados + endereços)
  ========================= */
  app.get("/tenant-profile", async (req, reply) => {
    const tenantId = req.auth?.activeTenantId;
    if (!tenantId) {
      return reply.code(401).send({ message: "Não autenticado." });
    }

    const item = await service.get(tenantId);
    return { item };
  });

  /* =========================
     PUT – UPSERT PERFIL
  ========================= */
  app.put("/tenant-profile", async (req, reply) => {
    const tenantId = req.auth?.activeTenantId;
    if (!tenantId) {
      return reply.code(401).send({ message: "Não autenticado." });
    }

    const body = tenantProfileUpsertSchema.parse(req.body);
    const item = await service.upsert(tenantId, body);

    return { item };
  });

  /* =========================
     POST – UPLOAD DO LOGO
     multipart/form-data
     campo: file
  ========================= */
  app.post("/tenant-profile/logo", async (req, reply) => {
    const tenantId = req.auth?.activeTenantId;
    if (!tenantId) {
      return reply.code(401).send({ message: "Não autenticado." });
    }

    // multipart já está habilitado globalmente no app.ts
    if (!req.isMultipart || !req.isMultipart()) {
      return reply
        .code(400)
        .send({ message: "Envio inválido. Use multipart/form-data." });
    }

    const file = await (req as any).file();
    if (!file) {
      return reply
        .code(400)
        .send({ message: "Envie um arquivo no campo 'file'." });
    }

    const buffer = await file.toBuffer();
    const mimeType = file.mimetype as string;

    const item = await service.uploadLogo(tenantId, {
      buffer,
      mimeType,
    });

    return reply.code(200).send({ item });
  });

  /* =========================
     DELETE – REMOVER LOGO
  ========================= */
  app.delete("/tenant-profile/logo", async (req, reply) => {
    const tenantId = req.auth?.activeTenantId;
    if (!tenantId) {
      return reply.code(401).send({ message: "Não autenticado." });
    }

    const res = await service.deleteLogo(tenantId);
    return res;
  });
}
