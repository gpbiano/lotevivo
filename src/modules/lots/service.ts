import { supabaseAdmin } from "../../config/supabase";

export class LotsService {
  private admin = supabaseAdmin();

  async list(tenantId: string) {
    const { data, error } = await this.admin
      .from("lots")
      .select(
        `
        id, tenant_id, code, lot_type, name, species, purpose, breed, status,
        supplier_id, location_id, start_date, notes,
        created_at, updated_at
      `
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async getById(tenantId: string, lotId: string) {
    const { data, error } = await this.admin
      .from("lots")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", lotId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async findByCode(tenantId: string, code: string) {
    const { data, error } = await this.admin
      .from("lots")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("code", code)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async create(
    tenantId: string,
    input: {
      code: string;
      lot_type: string; // ✅ obrigatório
      name: string;
      species: string;
      purpose: string;
      breed?: string | null;
      supplier_id?: string | null;
      location_id?: string | null;
      start_date: string;
      status: string;
      notes?: string | null;
    }
  ) {
    const existing = await this.findByCode(tenantId, input.code);
    if (existing) return { created: false, lot: existing };

    const { data, error } = await this.admin
      .from("lots")
      .insert({
        tenant_id: tenantId,
        code: input.code,
        lot_type: input.lot_type, // ✅ aqui
        name: input.name,
        species: input.species,
        purpose: input.purpose,
        breed: input.breed ?? null,
        supplier_id: input.supplier_id ?? null,
        location_id: input.location_id ?? null,
        start_date: input.start_date,
        status: input.status,
        notes: input.notes ?? null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return { created: true, lot: data };
  }
}
