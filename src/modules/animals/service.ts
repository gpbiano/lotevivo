import type { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../../config/supabase";

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

type WeighingRow = {
  id: string;
  weighed_at: string;
  weight_kg: number;
  gmd_kg_day: number | null;
};

type WeighingSeriesRow = {
  weighed_at: string;
  weight_kg: number;
  gmd_kg_day: number | null;
};

export function animalsService(_app: FastifyInstance) {
  // ✅ usa admin client — não depende de app.supabase
  const db = supabaseAdmin();

  async function listAnimals(params: {
    tenantId: string;
    lotId?: string;
    status?: string;
    search?: string;
    limit?: number;
  }) {
    const { tenantId, lotId, status, search, limit = 200 } = params;

    let q = db
      .from("animals")
      .select(
        "id, tag_id, name, species, sex, breed, birth_date, status, current_lot_id, current_location_id, created_at"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (lotId) q = q.eq("current_lot_id", lotId);
    if (status) q = q.eq("status", status);

    if (search) {
      q = q.or(`tag_id.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  async function getAnimalById(tenantId: string, animalId: string) {
    const { data, error } = await db
      .from("animals")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", animalId)
      .single();

    if (error) throw error;
    return data;
  }

  async function getLastWeighing(tenantId: string, animalId: string) {
    const { data, error } = await db
      .from("animal_weighings")
      .select("id, weighed_at, weight_kg, gmd_kg_day")
      .eq("tenant_id", tenantId)
      .eq("animal_id", animalId)
      .order("weighed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as WeighingRow | null) ?? null;
  }

  async function createWeighingWithGmd(params: {
    tenantId: string;
    animalId: string;
    weighedAt: string;
    weightKg: number;
    notes?: string | null;
    createdBy?: string | null;
  }) {
    const { tenantId, animalId, weighedAt, weightKg, notes, createdBy } = params;

    const last = await getLastWeighing(tenantId, animalId);

    // MVP: bloqueia retroativa / mesma data
    if (last?.weighed_at && new Date(weighedAt) <= new Date(last.weighed_at)) {
      const err: any = new Error("Pesagem deve ser maior que a última pesagem.");
      err.statusCode = 409;
      throw err;
    }

    let prev_weighing_id: string | null = null;
    let prev_weight_kg: number | null = null;
    let delta_days: number | null = null;
    let delta_weight_kg: number | null = null;
    let gmd_kg_day: number | null = null;

    if (last?.id) {
      const d = daysBetween(new Date(weighedAt), new Date(last.weighed_at));

      if (d < 1) {
        const err: any = new Error("Intervalo mínimo entre pesagens é de 1 dia.");
        err.statusCode = 400;
        throw err;
      }

      prev_weighing_id = last.id;
      prev_weight_kg = Number(last.weight_kg);
      delta_days = d;
      delta_weight_kg = Number((weightKg - prev_weight_kg).toFixed(2));
      gmd_kg_day = Number((delta_weight_kg / delta_days).toFixed(4));
    }

    const { data, error } = await db
      .from("animal_weighings")
      .insert({
        tenant_id: tenantId,
        animal_id: animalId,
        weighed_at: weighedAt,
        weight_kg: weightKg,
        prev_weighing_id,
        prev_weight_kg,
        delta_days,
        delta_weight_kg,
        gmd_kg_day,
        notes: notes ?? null,
        created_by: createdBy ?? null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  async function listWeighings(params: {
    tenantId: string;
    animalId: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const { tenantId, animalId, from, to, limit = 100 } = params;

    let q = db
      .from("animal_weighings")
      .select(
        "id, weighed_at, weight_kg, prev_weighing_id, prev_weight_kg, delta_days, delta_weight_kg, gmd_kg_day, notes, created_at"
      )
      .eq("tenant_id", tenantId)
      .eq("animal_id", animalId)
      .order("weighed_at", { ascending: false })
      .limit(limit);

    if (from) q = q.gte("weighed_at", from);
    if (to) q = q.lte("weighed_at", to);

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  async function getWeighingsSeries(params: {
    tenantId: string;
    animalId: string;
    from?: string;
    to?: string;
  }) {
    const { tenantId, animalId, from, to } = params;

    let q = db
      .from("animal_weighings")
      .select("weighed_at, weight_kg, gmd_kg_day")
      .eq("tenant_id", tenantId)
      .eq("animal_id", animalId)
      .order("weighed_at", { ascending: true });

    if (from) q = q.gte("weighed_at", from);
    if (to) q = q.lte("weighed_at", to);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as WeighingSeriesRow[];

    const series = rows.map((x: WeighingSeriesRow) => ({
      date: new Date(x.weighed_at).toISOString().slice(0, 10),
      weight_kg: Number(x.weight_kg),
      gmd_kg_day: x.gmd_kg_day === null ? null : Number(x.gmd_kg_day),
    }));

    // ✅ evita Array.prototype.at (compatível com targets antigos)
    const last = series.length ? series[series.length - 1] : null;

    const gmds = series
      .filter((s: { gmd_kg_day: number | null }) => s.gmd_kg_day !== null)
      .map((s: { gmd_kg_day: number | null }) => s.gmd_kg_day as number);

    let trend: "up" | "down" | "flat" | "na" = "na";
    if (gmds.length >= 2) {
      const a = gmds[gmds.length - 2];
      const b = gmds[gmds.length - 1];
      trend = b > a ? "up" : b < a ? "down" : "flat";
    }

    return {
      animal_id: animalId,
      series,
      summary: {
        last_weight_kg: last?.weight_kg ?? null,
        last_gmd_kg_day: gmds.length ? gmds[gmds.length - 1] : null,
        trend,
      },
    };
  }

  return {
    listAnimals,
    getAnimalById,
    createWeighingWithGmd,
    listWeighings,
    getWeighingsSeries,
  };
}
