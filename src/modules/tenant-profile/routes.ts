import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { z } from "zod";
import { TenantProfileService } from "./service";
import { tenantProfileUpsertSchema } from "./schemas";

export async function tenantProfileRoutes(app: FastifyInstance) {
  const service = new TenantProfileService();

  // habilita multipart só para este módulo
  await app.register(multipart, {
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
      files: 1,
    },
  });

  // GET perfil completo (profile + addresses)
  app.get("/tenant-profile", async (req) => {
    return service.get(req.auth!.activeTenantId);
  });

  // PUT upsert perfil + endereços
  app.put("/tenant-profile", async (req) => {
    const body = tenantProfileUpsertSchema.parse(req.body);
    return service.upsert(req.auth!.activeTenantId, body);
  });

  // POST upload logo (multipart/form-data, campo "file")
  app.post("/tenant-profile/logo", async (req, reply) => {
    const file = await (req as any).file();
    if (!file) return reply.code(400).send({ message: "Envie um arquivo no campo 'file'." });

    const buffer = await file.toBuffer();
    const mimeType = file.mimetype as string;

    const res = await service.uploadLogo(req.auth!.activeTenantId, { buffer, mimeType });
    return reply.code(200).send(res);
  });

  // DELETE logo
  app.delete("/tenant-profile/logo", async (req) => {
    return service.deleteLogo(req.auth!.activeTenantId);
  });
}
