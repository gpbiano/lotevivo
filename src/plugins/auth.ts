// src/plugins/auth.ts

import fp from "fastify-plugin";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { supabaseAdmin } from "../config/supabase";
import type { AuthContext, TenantRole, UserRole } from "../shared/types";
import { env } from "../config/env";

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

type UserProfileRow = {
  active_tenant_id: string | null;
  global_role: string | null; // "super_admin" | null
  email: string | null;
};

type TenantUserRow = {
  tenant_id: string;
  role: TenantRole;
};

export default fp(async function authPlugin(fastify) {
  const issuer = env.jwtIssuer;
  const audience = env.jwtAudience;

  const jwksUrl = new URL(`${issuer}/.well-known/jwks.json`);
  const jwks = createRemoteJWKSet(jwksUrl);

  fastify.decorateRequest("auth", undefined);

  fastify.addHook("preHandler", async (req, reply) => {
    // 1) Preflight
    if (req.method === "OPTIONS") {
      return reply.code(204).send();
    }

    // 2) Rotas públicas
    const isPublic = Boolean((req.routeOptions as any)?.config?.public);
    if (isPublic) return;

    // 3) Bearer
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.code(401).send({ message: "Token ausente." });
    }
    const token = authHeader.slice("Bearer ".length);

    // 4) JWT verify
    let payload: any;
    try {
      const verified = await jwtVerify(token, jwks, { issuer, audience });
      payload = verified.payload;
    } catch {
      return reply.code(401).send({ message: "Token inválido." });
    }

    const userId = payload.sub as string | undefined;
    if (!userId) {
      return reply.code(401).send({ message: "Token inválido (sub ausente)." });
    }

    const emailFromToken = (payload.email as string | undefined) ?? undefined;

    const admin = supabaseAdmin();

    // 5) Carrega user_profiles
    const { data: rawProfile, error: profileErr } = await admin
      .from("user_profiles")
      .select("active_tenant_id, global_role, email")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileErr) {
      return reply.code(500).send({ message: "Falha ao carregar perfil do usuário." });
    }

    const profile = (rawProfile ?? null) as UserProfileRow | null;
    const isSuperAdmin = profile?.global_role === "super_admin";

    let activeTenantId: string | null = profile?.active_tenant_id ?? null;

    // 6) Se não tem tenant ativo, pega o primeiro tenant_users e salva no profile
    if (!activeTenantId) {
      const { data: rawTu, error: tuErr } = await admin
        .from("tenant_users")
        .select("tenant_id, role")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (tuErr) {
        return reply.code(500).send({ message: "Falha ao carregar vínculo do usuário ao tenant." });
      }

      const tu = (rawTu ?? null) as TenantUserRow | null;

      if (!tu?.tenant_id) {
        return reply.code(403).send({ message: "Usuário não possui empresa vinculada." });
      }

      activeTenantId = tu.tenant_id;

      const { error: upErr } = await admin
        .from("user_profiles")
        .upsert(
          {
            user_id: userId,
            active_tenant_id: activeTenantId,
            email: emailFromToken ?? profile?.email ?? null,
          },
          { onConflict: "user_id" }
        );

      if (upErr) {
        return reply.code(500).send({ message: "Falha ao definir empresa ativa do usuário." });
      }
    } else {
      // best effort: sincroniza email se vier do token
      if (emailFromToken && profile?.email !== emailFromToken) {
        await admin.from("user_profiles").update({ email: emailFromToken }).eq("user_id", userId);
      }
    }

    if (!activeTenantId) {
      return reply.code(403).send({ message: "Empresa ativa não definida." });
    }

    // 7) role final: super_admin OU role do tenant ativo
    let finalRole: UserRole = "OPERATOR";

    if (isSuperAdmin) {
      finalRole = "super_admin";
    } else {
      const { data: rawRoleRow, error: roleErr } = await admin
        .from("tenant_users")
        .select("role")
        .eq("user_id", userId)
        .eq("tenant_id", activeTenantId)
        .maybeSingle();

      if (roleErr) {
        return reply.code(500).send({ message: "Falha ao carregar permissão do usuário." });
      }

      const roleRow = (rawRoleRow ?? null) as { role: TenantRole } | null;

      if (!roleRow?.role) {
        return reply.code(403).send({ message: "Usuário não pertence à empresa ativa." });
      }

      finalRole = roleRow.role;
    }

    // 8) Injeta auth
    req.auth = {
      userId,
      activeTenantId,
      role: finalRole,
      isSuperAdmin,
      email: emailFromToken ?? (profile?.email ?? undefined),
    };
  });
});

