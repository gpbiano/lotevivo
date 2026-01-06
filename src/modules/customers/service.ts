import type { FastifyInstance } from "fastify";

export type CustomerType = "PF" | "PJ" | "OUTRO" | string;

type ListCustomersParams = {
  tenantId: string;
  search?: string;
  isActive?: string;
  limit?: unknown;
};

type GetCustomerParams = {
  tenantId: string;
  customerId: string;
};

type CreateCustomerParams = {
  tenantId: string;
  type: CustomerType;
  name: string;
  trade_name?: string | null;
  document?: string | null;
  state_registration?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

type UpdateCustomerParams = {
  tenantId: string;
  customerId: string;
  type?: CustomerType;
  name?: string;
  trade_name?: string | null;
  document?: string | null;
  state_registration?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

type ListCustomerContactsParams = {
  tenantId: string;
  customerId: string;
  limit?: unknown;
};

type CreateCustomerContactParams = {
  tenantId: string;
  customerId: string;
  name?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

type ListCustomerAddressesParams = {
  tenantId: string;
  customerId: string;
  limit?: unknown;
};

type CreateCustomerAddressParams = {
  tenantId: string;
  customerId: string;
  label?: string | null;
  zip_code?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

function normalizeLimit(limit?: unknown, fallback = 200) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), 500);
}

function cleanSearch(value: string) {
  // remove % e espaços extras (evita quebrar o ilike/or)
  return value.trim().replace(/%/g, "");
}

export function customersService(app: FastifyInstance) {
  const db = (app as any).supabase;

  async function listCustomers(params: ListCustomersParams) {
    const { tenantId, search, isActive } = params;
    const limit = normalizeLimit(params.limit, 200);

    let q = db
      .from("customers")
      .select(
        "id, tenant_id, type, name, trade_name, document, state_registration, email, phone, notes, is_active, created_at, updated_at"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (typeof isActive === "string" && isActive.length) {
      const v = isActive === "true" || isActive === "1";
      q = q.eq("is_active", v);
    }

    if (search && search.trim()) {
      const s = cleanSearch(search);
      q = q.or(
        [
          `name.ilike.%${s}%`,
          `trade_name.ilike.%${s}%`,
          `document.ilike.%${s}%`,
          `email.ilike.%${s}%`,
          `phone.ilike.%${s}%`,
        ].join(",")
      );
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  async function getCustomerById(params: GetCustomerParams) {
    const { tenantId, customerId } = params;

    const { data, error } = await db
      .from("customers")
      .select(
        "id, tenant_id, type, name, trade_name, document, state_registration, email, phone, notes, is_active, created_at, updated_at"
      )
      .eq("tenant_id", tenantId)
      .eq("id", customerId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const err: any = new Error("Cliente não encontrado.");
      err.statusCode = 404;
      throw err;
    }

    return data;
  }

  async function createCustomer(params: CreateCustomerParams) {
    const payload = {
      tenant_id: params.tenantId,
      type: params.type,
      name: params.name,
      trade_name: params.trade_name ?? null,
      document: params.document ?? null,
      state_registration: params.state_registration ?? null,
      email: params.email ?? null,
      phone: params.phone ?? null,
      notes: params.notes ?? null,
      is_active: params.is_active ?? true,
    };

    const { data, error } = await db
      .from("customers")
      .insert(payload)
      .select(
        "id, tenant_id, type, name, trade_name, document, state_registration, email, phone, notes, is_active, created_at, updated_at"
      )
      .single();

    if (error) throw error;
    return data;
  }

  async function updateCustomer(params: UpdateCustomerParams) {
    const patch: Record<string, unknown> = {};

    if (params.type !== undefined) patch.type = params.type;
    if (params.name !== undefined) patch.name = params.name;
    if (params.trade_name !== undefined) patch.trade_name = params.trade_name;
    if (params.document !== undefined) patch.document = params.document;
    if (params.state_registration !== undefined) patch.state_registration = params.state_registration;
    if (params.email !== undefined) patch.email = params.email;
    if (params.phone !== undefined) patch.phone = params.phone;
    if (params.notes !== undefined) patch.notes = params.notes;
    if (params.is_active !== undefined) patch.is_active = params.is_active;

    const { data, error } = await db
      .from("customers")
      .update(patch)
      .eq("tenant_id", params.tenantId)
      .eq("id", params.customerId)
      .select(
        "id, tenant_id, type, name, trade_name, document, state_registration, email, phone, notes, is_active, created_at, updated_at"
      )
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const err: any = new Error("Cliente não encontrado.");
      err.statusCode = 404;
      throw err;
    }

    return data;
  }

  // ---- contatos ----

  async function listCustomerContacts(params: ListCustomerContactsParams) {
    const limit = normalizeLimit(params.limit, 200);

    const { data, error } = await db
      .from("customer_contacts")
      .select("id, tenant_id, customer_id, name, role, email, phone, notes, created_at, updated_at")
      .eq("tenant_id", params.tenantId)
      .eq("customer_id", params.customerId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  }

  async function createCustomerContact(params: CreateCustomerContactParams) {
    const payload = {
      tenant_id: params.tenantId,
      customer_id: params.customerId,
      name: params.name ?? null,
      role: params.role ?? null,
      email: params.email ?? null,
      phone: params.phone ?? null,
      notes: params.notes ?? null,
    };

    const { data, error } = await db
      .from("customer_contacts")
      .insert(payload)
      .select("id, tenant_id, customer_id, name, role, email, phone, notes, created_at, updated_at")
      .single();

    if (error) throw error;
    return data;
  }

  // ---- endereços ----

  async function listCustomerAddresses(params: ListCustomerAddressesParams) {
    const limit = normalizeLimit(params.limit, 200);

    const { data, error } = await db
      .from("customer_addresses")
      .select(
        "id, tenant_id, customer_id, label, zip_code, street, number, complement, neighborhood, city, state, country, created_at, updated_at"
      )
      .eq("tenant_id", params.tenantId)
      .eq("customer_id", params.customerId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  }

  async function createCustomerAddress(params: CreateCustomerAddressParams) {
    const payload = {
      tenant_id: params.tenantId,
      customer_id: params.customerId,
      label: params.label ?? null,
      zip_code: params.zip_code ?? null,
      street: params.street ?? null,
      number: params.number ?? null,
      complement: params.complement ?? null,
      neighborhood: params.neighborhood ?? null,
      city: params.city ?? null,
      state: params.state ?? null,
      country: params.country ?? null,
    };

    const { data, error } = await db
      .from("customer_addresses")
      .insert(payload)
      .select(
        "id, tenant_id, customer_id, label, zip_code, street, number, complement, neighborhood, city, state, country, created_at, updated_at"
      )
      .single();

    if (error) throw error;
    return data;
  }

  return {
    // ✅ nomes padronizados (é isso que corrige seu erro TS2551)
    listCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    listCustomerContacts,
    createCustomerContact,
    listCustomerAddresses,
    createCustomerAddress,
  };
}
