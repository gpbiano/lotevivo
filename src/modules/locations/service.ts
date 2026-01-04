import { supabaseAdmin } from "../../config/supabase";

export class LocationsService {
  private admin = supabaseAdmin();

  async list(tenantId: string) {
    const { data, error } = await this.admin
      .from("locations")
      .select("id, tenant_id, name, type, notes, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async getById(tenantId: string, locationId: string) {
    const { data, error } = await this.admin
      .from("locations")
      .select("id, tenant_id, name, type, notes, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .eq("id", locationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async findByName(tenantId: string, name: string) {
    const { data, error } = await this.admin
      .from("locations")
      .select("id, tenant_id, name, type, notes, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .eq("name", name)
      .maybeSingle();

    if (error) throw error;
    return data; // null se não existir
  }

  // idempotente por (tenant_id, name)
  async create(
    tenantId: string,
    input: {
      name: string;
      type: string; // ✅ obrigatório no seu schema (NOT NULL)
      notes?: string | null;
    }
  ) {
    const existing = await this.findByName(tenantId, input.name);
    if (existing) return { created: false, location: existing };

    const { data, error } = await this.admin
      .from("locations")
      .insert({
        tenant_id: tenantId,
        name: input.name,
        type: input.type, // ✅ aqui
        notes: input.notes ?? null,
      })
      .select("id, tenant_id, name, type, notes, created_at, updated_at")
      .single();

    if (error) throw error;
    return { created: true, location: data };
  }

  async update(
    tenantId: string,
    locationId: string,
    input: { name?: string; type?: string; notes?: string | null }
  ) {
    const { data, error } = await this.admin
      .from("locations")
      .update({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", locationId)
      .select("id, tenant_id, name, type, notes, created_at, updated_at")
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async delete(tenantId: string, locationId: string) {
    const { error } = await this.admin
      .from("locations")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", locationId);

    if (error) throw error;
    return { ok: true };
  }
}
