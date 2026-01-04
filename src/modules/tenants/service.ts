import { supabaseAdmin } from "../../config/supabase";

export class TenantsService {
  private admin = supabaseAdmin();

  async listForUser(userId: string) {
    const { data, error } = await this.admin
      .from("tenant_users")
      .select("tenant_id, role, tenants:tenant_id(id, name, slug, status)")
      .eq("user_id", userId);

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      tenantId: row.tenant_id,
      role: row.role,
      tenant: row.tenants,
    }));
  }

  async getActiveTenantId(userId: string) {
    const { data, error } = await this.admin
      .from("user_profiles")
      .select("active_tenant_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data?.active_tenant_id as string | null) ?? null;
  }

  async selectActiveTenant(userId: string, tenantId: string) {
    const { data, error } = await this.admin
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error || !data) {
      const err: any = new Error("User is not a member of this tenant");
      err.statusCode = 403;
      throw err;
    }

    const { error: upErr } = await this.admin.from("user_profiles").upsert({
      user_id: userId,
      active_tenant_id: tenantId,
    });

    if (upErr) throw upErr;

    return { activeTenantId: tenantId };
  }
}
