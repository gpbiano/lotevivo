import type { FastifyInstance } from "fastify";

type UserRole = "ADMIN" | "OPERATOR" | "CONSULTANT";

export function tenantsService(app: FastifyInstance) {
  const db = (app as any).supabase;

  function normalizeLimit(limit?: unknown, fallback = 200) {
    const n = Number(limit);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(Math.floor(n), 500);
  }

  function onlyDigits(s: string) {
    return (s ?? "").replace(/\D/g, "");
  }

  async function listTenants(params: { limit?: unknown; search?: string }) {
    const limit = normalizeLimit(params.limit);
    const search = (params.search ?? "").trim();

    let q = db
      .from("tenants")
      .select(
        `
        id,
        is_active,
        created_at,
        tenant_profiles (
          legal_name,
          trade_name,
          document
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (search) {
      q = q.limit(Math.max(limit, 200));
    }

    const { data, error } = await q;
    if (error) throw error;

    let rows =
      (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.tenant_profiles?.legal_name ?? "—",
        trade_name: row.tenant_profiles?.trade_name ?? null,
        document: row.tenant_profiles?.document ?? null,
        is_active: !!row.is_active,
        created_at: row.created_at,
      })) ?? [];

    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((r: any) => {
        const name = String(r.name ?? "").toLowerCase();
        const trade = String(r.trade_name ?? "").toLowerCase();
        const doc = String(r.document ?? "").toLowerCase();
        return name.includes(s) || trade.includes(s) || doc.includes(s);
      });
    }

    return rows.slice(0, limit);
  }

  async function getTenantAdmin(tenantId: string) {
    const { data: tenant, error: tErr } = await db
      .from("tenants")
      .select("id, is_active, created_at")
      .eq("id", tenantId)
      .maybeSingle();

    if (tErr) throw tErr;
    if (!tenant) {
      const e: any = new Error("Empresa não encontrada.");
      e.statusCode = 404;
      throw e;
    }

    const { data: profile, error: pErr } = await db
      .from("tenant_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (pErr) throw pErr;

    const { data: addresses, error: aErr } = await db
      .from("tenant_addresses")
      .select("*")
      .eq("tenant_id", tenantId);

    if (aErr) throw aErr;

    const fiscal = (addresses ?? []).find((a: any) => a.address_type === "FISCAL") ?? null;
    const production = (addresses ?? []).find((a: any) => a.address_type === "PRODUCTION") ?? null;

    return {
      tenant,
      profile,
      addresses: { fiscal, production },
    };
  }

  async function upsertAddress(tenantId: string, addressType: "FISCAL" | "PRODUCTION", input: any) {
    const { data, error } = await db
      .from("tenant_addresses")
      .upsert(
        {
          tenant_id: tenantId,
          address_type: addressType,
          zip_code: input?.zip_code ?? null,
          street: input?.street ?? null,
          number: input?.number ?? null,
          district: input?.district ?? null,
          city: input?.city ?? null,
          state: input?.state ?? null,
          complement: input?.complement ?? null,
        },
        { onConflict: "tenant_id,address_type" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  async function createTenantAdmin(input: any) {
    const isActive = input.is_active ?? true;

    const { data: tenant, error: tErr } = await db
      .from("tenants")
      .insert({ is_active: isActive })
      .select("id, is_active, created_at")
      .single();

    if (tErr) throw tErr;

    const tenantId = tenant.id as string;

    const { data: profile, error: pErr } = await db
      .from("tenant_profiles")
      .insert({
        tenant_id: tenantId,
        person_type: input.person_type,
        document: onlyDigits(input.document),

        legal_name: input.legal_name,
        trade_name: input.trade_name ?? null,
        state_registration: input.state_registration ?? null,

        responsible_name: input.responsible_name ?? null,
        responsible_document: input.responsible_document ?? null,

        email: input.email ?? null,
        phone: input.phone ?? null,
        marketing_opt_in: input.marketing_opt_in ?? false,
      })
      .select("*")
      .single();

    if (pErr) throw pErr;

    const fiscal = await upsertAddress(tenantId, "FISCAL", input.address_fiscal ?? {});
    const production =
      input.production_same_as_fiscal ?? true
        ? await upsertAddress(tenantId, "PRODUCTION", input.address_fiscal ?? {})
        : await upsertAddress(tenantId, "PRODUCTION", input.address_production ?? {});

    return { tenant, profile, addresses: { fiscal, production } };
  }

  async function updateTenantAdmin(tenantId: string, input: any) {
    const { data: profile, error: pErr } = await db
      .from("tenant_profiles")
      .update({
        trade_name: input.trade_name ?? null,
        state_registration: input.state_registration ?? null,
        responsible_name: input.responsible_name ?? null,
        responsible_document: input.responsible_document ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        marketing_opt_in: input.marketing_opt_in ?? false,
      })
      .eq("tenant_id", tenantId)
      .select("*")
      .maybeSingle();

    if (pErr) throw pErr;

    const fiscal = await upsertAddress(tenantId, "FISCAL", input.address_fiscal ?? {});
    const production =
      input.production_same_as_fiscal ?? true
        ? await upsertAddress(tenantId, "PRODUCTION", input.address_fiscal ?? {})
        : await upsertAddress(tenantId, "PRODUCTION", input.address_production ?? {});

    const { data: tenant, error: tErr } = await db
      .from("tenants")
      .select("id, is_active, created_at")
      .eq("id", tenantId)
      .maybeSingle();

    if (tErr) throw tErr;

    return { tenant, profile, addresses: { fiscal, production } };
  }

  async function setTenantStatus(params: { tenantId: string; isActive: boolean }) {
    const { error } = await db
      .from("tenants")
      .update({ is_active: params.isActive })
      .eq("id", params.tenantId);

    if (error) throw error;
    return { ok: true };
  }

  // ==========================
  // USERS DO TENANT (ADMIN)
  // ==========================

  async function listTenantUsersAdmin(tenantId: string) {
    // 1) lista vínculos
    const { data: links, error: lErr } = await db
      .from("tenant_users")
      .select("user_id, role, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (lErr) throw lErr;

    const userIds = Array.from(new Set((links ?? []).map((x: any) => x.user_id).filter(Boolean)));

    // 2) busca perfis (public.user_profiles) — SEM auth.users
    let profilesById = new Map<string, any>();
    if (userIds.length) {
      const { data: profiles, error: pErr } = await db
        .from("user_profiles")
        .select("user_id, email, full_name, avatar_url")
        .in("user_id", userIds);

      if (pErr) throw pErr;

      (profiles ?? []).forEach((p: any) => profilesById.set(p.user_id, p));
    }

    // 3) monta retorno
    return (links ?? []).map((r: any) => {
      const p = profilesById.get(r.user_id) ?? null;
      return {
        user_id: r.user_id,
        email: p?.email ?? null,
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        role: r.role as UserRole,
        created_at: r.created_at,
      };
    });
  }

  async function getUserIdByEmail(email: string) {
    const { data, error } = await db
      .from("user_profiles")
      .select("user_id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (error) throw error;
    return (data as any)?.user_id as string | null;
  }

  async function addUserToTenantByEmailAdmin(params: { tenantId: string; email: string; role: UserRole }) {
    const email = params.email.trim().toLowerCase();
    const userId = await getUserIdByEmail(email);

    if (!userId) {
      const e: any = new Error("Usuário não encontrado (email não existe no sistema).");
      e.statusCode = 404;
      throw e;
    }

    const { data: existing, error: exErr } = await db
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", params.tenantId)
      .eq("user_id", userId)
      .maybeSingle();

    if (exErr) throw exErr;
    if (existing?.id) {
      const e: any = new Error("Usuário já está vinculado a esta empresa.");
      e.statusCode = 409;
      throw e;
    }

    const { error } = await db.from("tenant_users").insert({
      tenant_id: params.tenantId,
      user_id: userId,
      role: params.role,
    });

    if (error) throw error;
    return { ok: true, user_id: userId };
  }

  async function updateUserRoleAdmin(params: { tenantId: string; userId: string; role: UserRole }) {
    const { error } = await db
      .from("tenant_users")
      .update({ role: params.role })
      .eq("tenant_id", params.tenantId)
      .eq("user_id", params.userId);

    if (error) throw error;
    return { ok: true };
  }

  async function removeUserFromTenantAdmin(params: { tenantId: string; userId: string }) {
    const { error } = await db
      .from("tenant_users")
      .delete()
      .eq("tenant_id", params.tenantId)
      .eq("user_id", params.userId);

    if (error) throw error;
    return { ok: true };
  }

  return {
    listTenants,
    getTenantAdmin,
    createTenantAdmin,
    updateTenantAdmin,
    setTenantStatus,

    listTenantUsersAdmin,
    addUserToTenantByEmailAdmin,
    updateUserRoleAdmin,
    removeUserFromTenantAdmin,
  };
}
