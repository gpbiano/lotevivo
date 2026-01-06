import { supabaseAdmin } from "../../config/supabase";

const db = supabaseAdmin();

type Auth = { activeTenantId: string };

export async function createIncubation(
  auth: Auth,
  body: {
    lotId: string;
    incubationType: "CHOCADORA" | "GALINHA";
    startedAt: string; // YYYY-MM-DD
    expectedHatchAt?: string | null;
    notes?: string | null;
  }
) {
  const { data: lot, error: lotErr } = await db
    .from("lots")
    .select("id, tenant_id, lot_type, species")
    .eq("id", body.lotId)
    .eq("tenant_id", auth.activeTenantId)
    .maybeSingle();

  if (lotErr) throw new Error(lotErr.message);
  if (!lot) throw new Error("Lote não encontrado.");
  if (lot.lot_type !== "INCUBACAO") throw new Error("Incubação deve ser vinculada a um lote do tipo INCUBACAO.");

  const { data, error } = await db
    .from("egg_incubations")
    .insert({
      tenant_id: auth.activeTenantId,
      lot_id: body.lotId,
      incubation_type: body.incubationType,
      started_at: body.startedAt,
      expected_hatch_at: body.expectedHatchAt ?? null,
      notes: body.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { item: data };
}

export async function addIncubationBatch(
  auth: Auth,
  incubationId: string,
  body: {
    eggProductionId: string;
    qtyEggsSet: number;
    setAt: string;
    notes?: string | null;
  }
) {
  const { data: inc, error: incErr } = await db
    .from("egg_incubations")
    .select("id, tenant_id, lot_id, lots!inner(species)")
    .eq("id", incubationId)
    .eq("tenant_id", auth.activeTenantId)
    .single();

  if (incErr) throw new Error(incErr.message);

  const incubationSpecies = (inc as any).lots.species as string;

  const { data: prod, error: prodErr } = await db
    .from("egg_production")
    .select("id, tenant_id, lot_id, qty_eggs, lots!inner(species, lot_type)")
    .eq("id", body.eggProductionId)
    .eq("tenant_id", auth.activeTenantId)
    .single();

  if (prodErr) throw new Error(prodErr.message);

  const prodLotType = (prod as any).lots.lot_type as string;
  const prodSpecies = (prod as any).lots.species as string;

  if (prodLotType !== "MATRIZES") throw new Error("A produção de ovos deve vir de um lote de MATRIZES.");
  if (prodSpecies !== incubationSpecies) throw new Error("Espécie da incubação não bate com a espécie da produção de ovos.");

  const { data, error } = await db
    .from("egg_incubation_batches")
    .insert({
      tenant_id: auth.activeTenantId,
      incubation_id: incubationId,
      egg_production_id: body.eggProductionId,
      qty_eggs_set: body.qtyEggsSet,
      set_at: body.setAt,
      notes: body.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { item: data };
}

export async function addOvoscopy(
  auth: Auth,
  incubationId: string,
  body: {
    checkAt: string;
    qtyChecked: number;
    qtyViable: number;
    qtyInviable: number;
    notes?: string | null;
  }
) {
  const { data, error } = await db
    .from("egg_ovoscopies")
    .insert({
      tenant_id: auth.activeTenantId,
      incubation_id: incubationId,
      check_at: body.checkAt,
      qty_checked: body.qtyChecked,
      qty_viable: body.qtyViable,
      qty_inviable: body.qtyInviable,
      notes: body.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { item: data };
}

export async function addHatching(
  auth: Auth,
  incubationId: string,
  body: {
    hatchAt: string;
    qtyHatched: number;
    qtyChicksAlive: number;
    qtyChicksDead: number;
    notes?: string | null;
  }
) {
  const { data, error } = await db
    .from("egg_hatchings")
    .insert({
      tenant_id: auth.activeTenantId,
      incubation_id: incubationId,
      hatch_at: body.hatchAt,
      qty_hatched: body.qtyHatched,
      qty_chicks_alive: body.qtyChicksAlive,
      qty_chicks_dead: body.qtyChicksDead,
      notes: body.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { item: data };
}
