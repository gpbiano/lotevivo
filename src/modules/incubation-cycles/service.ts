import { supabaseAdmin } from "../../config/supabase";

const db = supabaseAdmin();

type Auth = { activeTenantId: string };

type LotRow = {
  id: string;
  tenant_id: string;
  lot_type: string; // "MATRIZES" | "INCUBACAO" | "VIVO" | ...
  species: string;  // "CHICKEN" | "QUAIL" | ...
};

export type IncubationCycleRow = {
  id: string;
  tenant_id: string;
  incubation_lot_id: string;

  source_type: string; // origin_type enum no banco
  supplier_id: string | null;
  source_lot_id: string | null;

  method: string; // incubation_method enum
  start_date: string; // YYYY-MM-DD
  eggs_set_qty: number;
  expected_hatch_date: string;

  status: string; // incubation_status enum

  created_at: string;
  updated_at: string;
};

async function getLotOrThrow(auth: Auth, lotId: string): Promise<LotRow> {
  const { data, error } = await db
    .from("lots")
    .select("id, tenant_id, lot_type, species")
    .eq("id", lotId)
    .eq("tenant_id", auth.activeTenantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Lote não encontrado.");
  return data as LotRow;
}

export async function listIncubationCycles(
  auth: Auth,
  params: {
    status?: string;
    incubationLotId?: string;
    dateFrom?: string;
    dateTo?: string;
    q?: string; // futuro (ex: busca por código do lote)
  }
) {
  let query = db
    .from("incubation_cycles")
    .select("*")
    .eq("tenant_id", auth.activeTenantId)
    .order("start_date", { ascending: false });

  if (params.status) query = query.eq("status", params.status);
  if (params.incubationLotId) query = query.eq("incubation_lot_id", params.incubationLotId);
  if (params.dateFrom) query = query.gte("start_date", params.dateFrom);
  if (params.dateTo) query = query.lte("start_date", params.dateTo);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return { items: (data ?? []) as IncubationCycleRow[] };
}

export async function getIncubationCycleById(auth: Auth, id: string) {
  const { data, error } = await db
    .from("incubation_cycles")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", auth.activeTenantId)
    .single();

  if (error) throw new Error(error.message);
  return { item: data as IncubationCycleRow };
}

export async function createIncubationCycle(
  auth: Auth,
  body: {
    incubationLotId: string;

    sourceType: string; // origin_type
    supplierId?: string | null;
    sourceLotId?: string | null;

    method: string; // incubation_method
    startDate: string; // YYYY-MM-DD
    eggsSetQty: number;
    expectedHatchDate: string; // YYYY-MM-DD

    status?: string; // default: depende do enum do banco
  }
) {
  // 1) valida lote de incubação
  const incubationLot = await getLotOrThrow(auth, body.incubationLotId);
  if (incubationLot.lot_type !== "INCUBACAO") {
    throw new Error("incubationLotId deve apontar para um lote do tipo INCUBACAO.");
  }

  // 2) valida origem (mínimo seguro)
  // - se tiver sourceLotId: lote deve ser MATRIZES e species tem que bater
  if (body.sourceLotId) {
    const sourceLot = await getLotOrThrow(auth, body.sourceLotId);

    if (sourceLot.lot_type !== "MATRIZES") {
      throw new Error("sourceLotId deve apontar para um lote do tipo MATRIZES.");
    }
    if (sourceLot.species !== incubationLot.species) {
      throw new Error("A espécie do lote de origem (matrizes) deve ser igual à espécie do lote de incubação.");
    }
  }

  // 3) regra mínima: pelo menos uma origem
  if (!body.supplierId && !body.sourceLotId) {
    throw new Error("Informe supplierId ou sourceLotId como origem do ciclo.");
  }

  // ⚠️ Ajuste esse default conforme seus valores do enum incubation_status
  const status = body.status ?? "ACTIVE";

  const { data, error } = await db
    .from("incubation_cycles")
    .insert({
      tenant_id: auth.activeTenantId,
      incubation_lot_id: body.incubationLotId,
      source_type: body.sourceType,
      supplier_id: body.supplierId ?? null,
      source_lot_id: body.sourceLotId ?? null,
      method: body.method,
      start_date: body.startDate,
      eggs_set_qty: body.eggsSetQty,
      expected_hatch_date: body.expectedHatchDate,
      status,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return { item: data as IncubationCycleRow };
}

export async function updateIncubationCycle(
  auth: Auth,
  id: string,
  body: Partial<{
    method: string;
    startDate: string;
    eggsSetQty: number;
    expectedHatchDate: string;
  }>
) {
  const patch: any = {};
  if (body.method !== undefined) patch.method = body.method;
  if (body.startDate !== undefined) patch.start_date = body.startDate;
  if (body.eggsSetQty !== undefined) patch.eggs_set_qty = body.eggsSetQty;
  if (body.expectedHatchDate !== undefined) patch.expected_hatch_date = body.expectedHatchDate;

  patch.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from("incubation_cycles")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", auth.activeTenantId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return { item: data as IncubationCycleRow };
}

export async function updateIncubationCycleStatus(
  auth: Auth,
  id: string,
  status: string
) {
  const { data, error } = await db
    .from("incubation_cycles")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", auth.activeTenantId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { item: data as IncubationCycleRow };
}
