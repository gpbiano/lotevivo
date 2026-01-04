import { supabaseAdmin } from "../../config/supabase";

export class SuppliersService {
  private admin = supabaseAdmin();

  async list(tenantId: string) {
    const { data, error } = await this.admin
      .from("suppliers")
      .select("id, tenant_id, type, legal_name, trade_name, document, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async getById(tenantId: string, supplierId: string) {
    const { data, error } = await this.admin
      .from("suppliers")
      .select(
        `
        id, tenant_id, type, legal_name, trade_name, document, state_registration, notes, created_at, updated_at,
        supplier_addresses(*),
        supplier_contacts(*)
      `
      )
      .eq("tenant_id", tenantId)
      .eq("id", supplierId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  // ✅ NEW: busca por document dentro do tenant (para idempotência)
  async findByDocument(tenantId: string, document: string) {
    const { data, error } = await this.admin
      .from("suppliers")
      .select("id, tenant_id, type, legal_name, trade_name, document, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .eq("document", document)
      .maybeSingle();

    if (error) throw error;
    return data; // null se não existir
  }

  // ✅ UPDATED: create idempotente e à prova de concorrência (trata unique 23505)
  async create(
    tenantId: string,
    input: {
      type: "PJ" | "PF";
      legal_name: string;
      trade_name?: string | null;
      document: string;
      state_registration?: string | null;
      notes?: string | null;
    }
  ) {
    const { data, error } = await this.admin
      .from("suppliers")
      .insert({
        tenant_id: tenantId,
        type: input.type,
        legal_name: input.legal_name,
        trade_name: input.trade_name ?? null,
        document: input.document,
        state_registration: input.state_registration ?? null,
        notes: input.notes ?? null,
      })
      .select("id, tenant_id, type, legal_name, trade_name, document, created_at, updated_at")
      .single();

    // ✅ criou normalmente
    if (!error) {
      return { created: true, supplier: data };
    }

    // ✅ se for duplicidade (unique), retorna o existente
    if ((error as any).code === "23505") {
      const existing = await this.findByDocument(tenantId, input.document);
      if (existing) return { created: false, supplier: existing };
    }

    // outros erros
    throw error;
  }

  async update(
    tenantId: string,
    supplierId: string,
    input: {
      type?: "PJ" | "PF";
      legal_name?: string;
      trade_name?: string | null;
      document?: string;
      state_registration?: string | null;
      notes?: string | null;
    }
  ) {
    const { data, error } = await this.admin
      .from("suppliers")
      .update({
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.legal_name !== undefined ? { legal_name: input.legal_name } : {}),
        ...(input.trade_name !== undefined ? { trade_name: input.trade_name } : {}),
        ...(input.document !== undefined ? { document: input.document } : {}),
        ...(input.state_registration !== undefined ? { state_registration: input.state_registration } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", supplierId)
      .select("id, tenant_id, type, legal_name, trade_name, document, created_at, updated_at")
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async addAddress(
    tenantId: string,
    supplierId: string,
    input: {
      zip_code?: string | null;
      street?: string | null;
      number?: string | null;
      district?: string | null;
      city?: string | null;
      state?: string | null;
      complement?: string | null;
    }
  ) {
    const supplier = await this.getById(tenantId, supplierId);
    if (!supplier) {
      const err: any = new Error("Supplier not found");
      err.statusCode = 404;
      throw err;
    }

    const { data, error } = await this.admin
      .from("supplier_addresses")
      .insert({
        tenant_id: tenantId,
        supplier_id: supplierId,
        ...input,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  async addContact(
    tenantId: string,
    supplierId: string,
    input: {
      name: string;
      phone?: string | null;
      email?: string | null;
      role?: string | null;
    }
  ) {
    const supplier = await this.getById(tenantId, supplierId);
    if (!supplier) {
      const err: any = new Error("Supplier not found");
      err.statusCode = 404;
      throw err;
    }

    const { data, error } = await this.admin
      .from("supplier_contacts")
      .insert({
        tenant_id: tenantId,
        supplier_id: supplierId,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        role: input.role ?? null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  async delete(tenantId: string, supplierId: string) {
    const { error } = await this.admin
      .from("suppliers")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", supplierId);

    if (error) throw error;
    return { ok: true };
  }
}
