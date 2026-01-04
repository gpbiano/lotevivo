import fp from "fastify-plugin";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { supabaseAdmin } from "../config/supabase";
import type { AuthContext, UserRole } from "../shared/types";
import { env } from "../config/env";

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

export default fp(async function authPlugin(fastify) {
  const issuer = env.jwtIssuer;
  const audience = env.jwtAudience;

  const jwksUrl = new URL(`${issuer}/.well-known/jwks.json`);
  const jwks = createRemoteJWKSet(jwksUrl);

  // melhor que null (evita confusão com "existe mas nulo")
  fastify.decorateRequest("auth", undefined);

  fastify.addHook("preHandler", async (req, reply) => {
    /**
     * ✅ 1) Libera preflight do CORS
     * O navegador envia OPTIONS sem Authorization.
     * Se a gente exigir Bearer aqui, quebra tudo (exatamente teu erro).
     */
    if (req.method === "OPTIONS") {
      return reply.code(204).send();
    }

    /**
     * ✅ 2) Rotas públicas
     */
    const isPublic = Boolean((req.routeOptions as any)?.config?.public);
    if (isPublic) return;

    /**
     * ✅ 3) Authorization
     */
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.code(401).send({ message: "Missing bearer token" });
    }

    const token = authHeader.slice("Bearer ".length);

    /**
     * ✅ 4) Verificação JWT
     */
    let payload: any;
    try {
      const verified = await jwtVerify(token, jwks, { issuer, audience });
      payload = verified.payload;
    } catch {
      return reply.code(401).send({ message: "Invalid token" });
    }

    const userId = payload.sub as string | undefined;
    if (!userId) {
      return reply.code(401).send({ message: "Invalid token sub" });
    }

    const admin = supabaseAdmin();

    /**
     * ✅ 5) Carrega profile (active_tenant_id)
     */
    const { data: profile, error: profileErr } = await admin
      .from("user_profiles")
      .select("active_tenant_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileErr) {
      return reply.code(500).send({ message: "Failed to load user profile" });
    }

    let activeTenantId = (profile?.active_tenant_id as string | null) ?? null;

    /**
     * ✅ 6) Se não tem tenant ativo, pega o primeiro e salva no profile
     */
    if (!activeTenantId) {
      const { data: tu, error: tuErr } = await admin
        .from("tenant_users")
        .select("tenant_id, role")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (tuErr) {
        return reply.code(500).send({ message: "Failed to load tenant" });
      }

      if (!tu?.tenant_id) {
        return reply.code(403).send({ message: "User has no tenant" });
      }

      activeTenantId = tu.tenant_id as string;

      const { error: upErr } = await admin.from("user_profiles").upsert({
        user_id: userId,
        active_tenant_id: activeTenantId,
      });

      if (upErr) {
        return reply.code(500).send({ message: "Failed to set active tenant" });
      }
    }

    /**
     * ✅ 7) Role do usuário no tenant ativo
     */
    const { data: roleRow, error: roleErr } = await admin
      .from("tenant_users")
      .select("role")
      .eq("user_id", userId)
      .eq("tenant_id", activeTenantId)
      .maybeSingle();

    if (roleErr) {
      return reply.code(500).send({ message: "Failed to load role" });
    }

    if (!roleRow?.role) {
      return reply.code(403).send({ message: "User not in active tenant" });
    }

    const role = roleRow.role as UserRole;

    /**
     * ✅ 8) Injeta contexto no request
     */
    req.auth = {
      userId,
      activeTenantId,
      role,
      email: payload.email as string | undefined,
    };
  });
});
