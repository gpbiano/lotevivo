import { supabaseAdmin } from "../../config/supabase";

const db = supabaseAdmin();

type Auth = { activeTenantId: string };

type LotRow = {
  id: string;
  tenant_id: string;
  lot_type: string;
  species: string;
};

export type EggProductionRow = {
  id: string;
  tenant_id: string;
  production_date: string;
  mode: string;

  lot_id: string;
  location_id: string | null;

  qty_eggs: number;
  qty_viable: number | null;
  qty_damaged: number | null;
  qty_for_incubation: number | null;

  notes: string | null;

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

async function ensureLocationIfProvided(auth: Auth, locationId?: string | null) {
  if (!locationId) return;

  const { data, error } = await db
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("tenant_id", auth.activeTenantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Local não encontrado.");
}

export async function listEggProduction(
  auth: Auth,
  params: {
    lotId?: string;
    locationId?: string;
    mode?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  let q = db
    .from("egg_production")
    .select("*")
    .eq("tenant_id", auth.activeTenantId)
    .order("production_date", { ascending: false });

  if (params.lotId) q = q.eq("lot_id", params.lotId);
  if (params.locationId) q = q.eq("location_id", params.locationId);
  if (params.mode) q = q.eq("mode", params.mode);
  if (params.dateFrom) q = q.gte("production_date", params.dateFrom);
  if (params.dateTo) q = q.lte("production_date", params.dateTo);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return { items: (data ?? []) as EggProductionRow[] };
}

export async function getEggProductionById(auth: Auth, id: string) {
  const { data, error } = await db
    .from("egg_production")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", auth.activeTenantId)
    .single();

  if (error) throw new Error(error.message);
  return { item: data as EggProductionRow };
}

export async function createEggProduction(
  auth: Auth,
  body: {
    productionDate: string;
    mode: string;
    lotId: string;
    locationId?: string | null;

    qtyEggs: number;
    qtyViable?: number | null;
    qtyDamaged?: number | null;
    qtyForIncubation?: number | null;

    notes?: string | null;
  }
) {
  const lot = await getLotOrThrow(auth, body.lotId);
  if (lot.lot_type !== "MATRIZES") {
    throw new Error("Produção de ovos só pode ser registrada em lotes de MATRIZES.");
  }

  await ensureLocationIfProvided(auth, body.locationId ?? null);

  // defaults inteligentes
  const qtyViable = body.qtyViable ?? body.qtyEggs;
  const qtyDamaged = body.qtyDamaged ?? 0;
  const qtyForIncubation = body.qtyForIncubation ?? 0;

  if (qtyViable + qtyDamaged > body.qtyEggs) {
    throw new Error("Quantidade viável + danificada não pode ser maior que o total de ovos.");
  }

  const { data, error } = await db
    .from("egg_production")
    .insert({
      tenant_id: auth.activeTenantId,
      production_date: body.productionDate,
      mode: body.mode,
      lot_id: body.lotId,
      location_id: body.locationId ?? null,

      qty_eggs: body.qtyEggs,
      qty_viable: qtyViable,
      qty_damaged: qtyDamaged,
      qty_for_incubation: qtyForIncubation,

      notes: body.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { item: data as EggProductionRow };
}

export async function updateEggProduction(
  auth: Auth,
  id: string,
  body: Partial<{
    productionDate: string;
    mode: string;
    locationId: string | null;

    qtyEggs: number;
    qtyViable: number | null;
    qtyDamaged: number | null;
    qtyForIncubation: number | null;

    notes: string | null;
  }>
) {
  const currentRes = await getEggProductionById(auth, id);
  const current = currentRes.item;

  if (body.locationId !== undefined) {
    await ensureLocationIfProvided(auth, body.locationId);
  }

  // montar novos valores para validar consistência
  const nextQtyEggs = body.qtyEggs ?? current.qty_eggs;
  const nextQtyViable =
    body.qtyViable !== undefined ? body.qtyViable : current.qty_viable ?? null;
  const nextQtyDamaged =
    body.qtyDamaged !== undefined ? body.qtyDamaged : current.qty_damaged ?? null;

  // se existirem valores, valida
  const viable = nextQtyViable ?? 0;
  const damaged = nextQtyDamaged ?? 0;
  if (viable + damaged > nextQtyEggs) {
    throw new Error("Quantidade viável + danificada não pode ser maior que o total de ovos.");
  }

  const patch: any = {};
  if (body.productionDate !== undefined) patch.production_date = body.productionDate;
  if (body.mode !== undefined) patch.mode = body.mode;
  if (body.locationId !== undefined) patch.location_id = body.locationId;

  if (body.qtyEggs !== undefined) patch.qty_eggs = body.qtyEggs;
  if (body.qtyViable !== undefined) patch.qty_viable = body.qtyViable;
  if (body.qtyDamaged !== undefined) patch.qty_damaged = body.qtyDamaged;
  if (body.qtyForIncubation !== undefined) patch.qty_for_incubation = body.qtyForIncubation;

  if (body.notes !== undefined) patch.notes = body.notes;

  patch.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from("egg_production")
    .update(patch)
    .eq("id", current.id)
    .eq("tenant_id", auth.activeTenantId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { item: data as EggProductionRow };
}
