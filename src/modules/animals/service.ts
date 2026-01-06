import type { FastifyInstance } from "fastify";

type Species = "bovinos" | "aves" | "suinos" | "ovinos" | "caprinos" | "equinos" | string;
type Sex = "male" | "female" | string;
type OriginType = "born" | "purchase" | "transfer" | "supplier" | string;
type AnimalStatus = "active" | "sold" | "dead" | "inactive" | string;

export type AnimalRow = {
  id: string;
  tenant_id: string;

  species: Species;
  tag_id: string | null;
  name: string | null;
  sex: Sex;
  breed: string | null;
  birth_date: string | null;
  origin_type: OriginType;
  supplier_id: string | null;

  status: AnimalStatus;
  current_lot_id: string | null;
  current_location_id: string | null;

  notes: string | null;

  created_at: string;
  updated_at: string;

  supplier_name?: string | null;
};

type WeighingRowDb = {
  id: string;
  tenant_id: string;
  animal_id: string;
  weighed_at: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type WeighingRow = WeighingRowDb & {
  gmd_kg_day: number | null; // ✅ mantemos no retorno (calculado)
};

type SeriesRow = { weighed_at: string; weight_kg: number };

function normalizeLimit(limit?: unknown, fallback = 200) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), 500);
}

function stripPercent(s: string) {
  return s.split("%").join("");
}

function asIsoDateOrNull(v?: string) {
  if (!v || typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t;
}

function daysBetween(a: string, b: string) {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return (ta - tb) / (1000 * 60 * 60 * 24);
}

export function animalsService(app: FastifyInstance) {
  const db = (app as any).supabase;

  if (!db) {
    throw new Error("Supabase não está configurado no backend (app.supabase).");
  }

  const BUCKET = process.env.ANIMAL_PHOTOS_BUCKET || "animal-photos";

  async function listAnimals(params: {
    tenantId: string;
    lotId?: string;
    status?: string;
    search?: string;
    limit?: unknown;
  }): Promise<AnimalRow[]> {
    const limit = normalizeLimit(params.limit, 200);

    let q = db
      .from("animals")
      .select(
        [
          "id",
          "tenant_id",
          "species",
          "tag_id",
          "name",
          "sex",
          "breed",
          "birth_date",
          "origin_type",
          "supplier_id",
          "supplier_name",
          "status",
          "current_lot_id",
          "current_location_id",
          "notes",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq("tenant_id", params.tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (params.lotId) q = q.eq("current_lot_id", params.lotId);
    if (params.status) q = q.eq("status", params.status);

    if (params.search && params.search.trim()) {
      const s = stripPercent(params.search.trim());
      q = q.or(
        [
          `tag_id.ilike.%${s}%`,
          `name.ilike.%${s}%`,
          `breed.ilike.%${s}%`,
          `supplier_name.ilike.%${s}%`,
        ].join(",")
      );
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as AnimalRow[];
  }

  async function getAnimalById(tenantId: string, animalId: string): Promise<AnimalRow> {
    const { data, error } = await db
      .from("animals")
      .select(
        [
          "id",
          "tenant_id",
          "species",
          "tag_id",
          "name",
          "sex",
          "breed",
          "birth_date",
          "origin_type",
          "supplier_id",
          "supplier_name",
          "status",
          "current_lot_id",
          "current_location_id",
          "notes",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq("tenant_id", tenantId)
      .eq("id", animalId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const err: any = new Error("Animal não encontrado.");
      err.statusCode = 404;
      throw err;
    }

    return data as AnimalRow;
  }

  async function createAnimal(params: {
    tenantId: string;
    tag_id?: string | null;
    name?: string | null;
    species: Species;
    sex: Sex;
    breed?: string | null;
    birth_date?: string | null;
    origin_type?: OriginType;
    supplier_id?: string | null;
    supplier_name?: string | null;
    status?: AnimalStatus;
    current_lot_id?: string | null;
    current_location_id?: string | null;
    notes?: string | null;
  }): Promise<AnimalRow> {
    const payload = {
      tenant_id: params.tenantId,
      tag_id: params.tag_id ?? null,
      name: params.name ?? null,
      species: params.species,
      sex: params.sex,
      breed: params.breed ?? null,
      birth_date: params.birth_date ?? null,
      origin_type: params.origin_type ?? "born",
      supplier_id: params.supplier_id ?? null,
      supplier_name: params.supplier_name ?? null,
      status: params.status ?? "active",
      current_lot_id: params.current_lot_id ?? null,
      current_location_id: params.current_location_id ?? null,
      notes: params.notes ?? null,
    };

    const { data, error } = await db
      .from("animals")
      .insert(payload)
      .select(
        [
          "id",
          "tenant_id",
          "species",
          "tag_id",
          "name",
          "sex",
          "breed",
          "birth_date",
          "origin_type",
          "supplier_id",
          "supplier_name",
          "status",
          "current_lot_id",
          "current_location_id",
          "notes",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .single();

    if (error) throw error;
    return data as AnimalRow;
  }

  // =========================
  // PESAGENS (SEM gmd_kg_day no banco)
  // =========================

  async function listWeighings(params: {
    tenantId: string;
    animalId: string;
    from?: string;
    to?: string;
    limit?: unknown;
  }): Promise<WeighingRow[]> {
    const limit = normalizeLimit(params.limit, 200);

    let q = db
      .from("weighings")
      .select("id, tenant_id, animal_id, weighed_at, weight_kg, notes, created_at, updated_at")
      .eq("tenant_id", params.tenantId)
      .eq("animal_id", params.animalId)
      .order("weighed_at", { ascending: false })
      .limit(limit);

    const from = asIsoDateOrNull(params.from);
    const to = asIsoDateOrNull(params.to);
    if (from) q = q.gte("weighed_at", from);
    if (to) q = q.lte("weighed_at", to);

    const { data, error } = await q;
    if (error) throw error;

    // Para calcular GMD, precisamos da série em ordem crescente.
    const rows = ((data ?? []) as WeighingRowDb[]).slice().reverse();

    const withGmdAsc: WeighingRow[] = rows.map((w: WeighingRowDb, idx: number) => {
      if (idx === 0) return { ...w, gmd_kg_day: null };
      const prev = rows[idx - 1];
      const d = daysBetween(w.weighed_at, prev.weighed_at);
      const gmd = d > 0 ? (Number(w.weight_kg) - Number(prev.weight_kg)) / d : null;
      return { ...w, gmd_kg_day: gmd === null || !Number.isFinite(gmd) ? null : gmd };
    });

    // retorna no mesmo formato pedido (desc)
    return withGmdAsc.reverse();
  }

  async function getWeighingsSeries(params: {
    tenantId: string;
    animalId: string;
    from?: string;
    to?: string;
  }): Promise<{ animal_id: string; items: Array<{ date: string; weight_kg: number; gmd_kg_day: number | null }> }> {
    let q = db
      .from("weighings")
      .select("weighed_at, weight_kg")
      .eq("tenant_id", params.tenantId)
      .eq("animal_id", params.animalId)
      .order("weighed_at", { ascending: true });

    const from = asIsoDateOrNull(params.from);
    const to = asIsoDateOrNull(params.to);
    if (from) q = q.gte("weighed_at", from);
    if (to) q = q.lte("weighed_at", to);

    const { data, error } = await q;
    if (error) throw error;

    const rows: SeriesRow[] = (data ?? []).map((r: { weighed_at: string; weight_kg: number }) => ({
      weighed_at: String(r.weighed_at),
      weight_kg: Number(r.weight_kg),
    }));

    const items = rows.map((r: SeriesRow, idx: number) => {
      if (idx === 0) {
        return { date: r.weighed_at, weight_kg: r.weight_kg, gmd_kg_day: null };
      }

      const prev = rows[idx - 1];
      const d = daysBetween(r.weighed_at, prev.weighed_at);
      const gmd = d > 0 ? (r.weight_kg - prev.weight_kg) / d : null;

      return {
        date: r.weighed_at,
        weight_kg: r.weight_kg,
        gmd_kg_day: gmd === null || !Number.isFinite(gmd) ? null : gmd,
      };
    });

    return { animal_id: params.animalId, items };
  }

  async function createWeighingWithGmd(params: {
    tenantId: string;
    animalId: string;
    weighedAt: string;
    weightKg: number;
    notes?: string | null;
    createdBy?: string | null;
  }): Promise<{ item: WeighingRow }> {
    // pega pesagem anterior (mais recente antes da atual)
    const { data: prev, error: prevErr } = await db
      .from("weighings")
      .select("weighed_at, weight_kg")
      .eq("tenant_id", params.tenantId)
      .eq("animal_id", params.animalId)
      .lt("weighed_at", params.weighedAt)
      .order("weighed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevErr) throw prevErr;

    let gmd: number | null = null;
    if (prev?.weighed_at && prev?.weight_kg !== undefined && prev?.weight_kg !== null) {
      const d = daysBetween(params.weighedAt, String(prev.weighed_at));
      const diff = Number(params.weightKg) - Number(prev.weight_kg);
      gmd = d > 0 ? diff / d : null;
      if (gmd !== null && !Number.isFinite(gmd)) gmd = null;
    }

    const payload: any = {
      tenant_id: params.tenantId,
      animal_id: params.animalId,
      weighed_at: params.weighedAt,
      weight_kg: params.weightKg,
      notes: params.notes ?? null,
    };

    // ✅ mantemos created_by opcional, MAS só se existir no banco
    if (params.createdBy) payload.created_by = params.createdBy;

    const { data, error } = await db
      .from("weighings")
      .insert(payload)
      .select("id, tenant_id, animal_id, weighed_at, weight_kg, notes, created_at, updated_at")
      .single();

    if (error) throw error;

    return { item: { ...(data as WeighingRowDb), gmd_kg_day: gmd } };
  }

  // =========================
  // FOTO DO ANIMAL (Storage)
  // =========================

  async function uploadAnimalPhoto(params: {
    tenantId: string;
    animalId: string;
    fileBuffer: Buffer;
    fileName: string;
    contentType?: string;
  }): Promise<{ path: string }> {
    const safeName = (params.fileName || "foto.jpg")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.\-_]/g, "");

    const path = `${params.tenantId}/${params.animalId}/${Date.now()}-${safeName}`;

    const { error } = await db.storage.from(BUCKET).upload(path, params.fileBuffer, {
      contentType: params.contentType || "image/jpeg",
      upsert: true,
    });

    if (error) throw error;

    // ⚠️ Opcional: se você criar a coluna photo_path no banco depois,
    // dá pra salvar aqui. Por enquanto, não quebra se a coluna não existir.
    try {
      await db
        .from("animals")
        .update({ photo_path: path })
        .eq("tenant_id", params.tenantId)
        .eq("id", params.animalId);
    } catch {
      // ignora se a coluna não existir ainda
    }

    return { path };
  }

  async function getAnimalPhotoSignedUrl(params: {
    path: string;
    expiresInSeconds?: number;
  }): Promise<{ signedUrl: string }> {
    const expiresIn = Math.max(60, Math.min(Number(params.expiresInSeconds ?? 3600), 60 * 60 * 24));

    const { data, error } = await db.storage.from(BUCKET).createSignedUrl(params.path, expiresIn);

    if (error) throw error;
    if (!data?.signedUrl) {
      const err: any = new Error("Não foi possível gerar o link da foto.");
      err.statusCode = 500;
      throw err;
    }

    return { signedUrl: data.signedUrl };
  }

  return {
    listAnimals,
    getAnimalById,
    createAnimal,

    listWeighings,
    getWeighingsSeries,
    createWeighingWithGmd,

    uploadAnimalPhoto,
    getAnimalPhotoSignedUrl,
  };
}
