import type { FastifyInstance } from "fastify";

type Auth = { activeTenantId: string };

export type ProductionStageRow = {
  id: string;
  tenant_id: string;
  chain: string;
  purpose: string | null;
  name: string;
  code: string;
  sort_order: number;
  is_terminal: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LotStageEventRow = {
  id: string;
  tenant_id: string;
  lot_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  event_date: string; // YYYY-MM-DD
  notes: string | null;
  meta: Record<string, any>; // ✅ normalizado no retorno (nunca null)
  created_at: string;
  updated_at: string;
};

function normalizeMeta(meta: any): Record<string, any> {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  return meta as Record<string, any>;
}

export function productionStagesService(app: FastifyInstance) {
  const db = (app as any).supabase;
  if (!db) throw new Error("Supabase não está configurado no backend (app.supabase).");

  async function listStages(auth: Auth, params: { chain: string; purpose?: string | null }) {
    let q = db
      .from("production_stages")
      .select("*")
      .eq("tenant_id", auth.activeTenantId)
      .eq("chain", params.chain)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    // se purpose vier, filtra:
    if (params.purpose !== undefined) {
      q = params.purpose === null ? q.is("purpose", null) : q.eq("purpose", params.purpose);
    }

    const { data, error } = await q;
    if (error) throw error;

    return { items: (data ?? []) as ProductionStageRow[] };
  }

  async function createStage(
    auth: Auth,
    body: {
      chain: string;
      purpose?: string | null;
      name: string;
      code: string;
      sortOrder?: number;
      isTerminal?: boolean;
      isActive?: boolean;
    }
  ) {
    const payload = {
      tenant_id: auth.activeTenantId,
      chain: body.chain,
      purpose: body.purpose ?? null,
      name: body.name,
      code: body.code,
      sort_order: body.sortOrder ?? 0,
      is_terminal: body.isTerminal ?? false,
      is_active: body.isActive ?? true,
    };

    const { data, error } = await db
      .from("production_stages")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return { item: data as ProductionStageRow };
  }

  async function updateStage(
    auth: Auth,
    id: string,
    body: Partial<{
      name: string;
      sortOrder: number;
      isTerminal: boolean;
      isActive: boolean;
      purpose: string | null;
    }>
  ) {
    const patch: any = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.sortOrder !== undefined) patch.sort_order = body.sortOrder;
    if (body.isTerminal !== undefined) patch.is_terminal = body.isTerminal;
    if (body.isActive !== undefined) patch.is_active = body.isActive;
    if (body.purpose !== undefined) patch.purpose = body.purpose;

    patch.updated_at = new Date().toISOString();

    const { data, error } = await db
      .from("production_stages")
      .update(patch)
      .eq("id", id)
      .eq("tenant_id", auth.activeTenantId)
      .select("*")
      .single();

    if (error) throw error;
    return { item: data as ProductionStageRow };
  }

  async function moveLotToStage(
    auth: Auth,
    lotId: string,
    body: {
      toStageId: string;
      eventDate: string; // YYYY-MM-DD
      notes?: string | null;
      meta?: Record<string, any>;
    }
  ) {
    // 1) pega estágio atual do lote
    const { data: lot, error: lotErr } = await db
      .from("lots")
      .select("id, tenant_id, stage_id")
      .eq("id", lotId)
      .eq("tenant_id", auth.activeTenantId)
      .maybeSingle();

    if (lotErr) throw lotErr;
    if (!lot) {
      const err: any = new Error("Lote não encontrado.");
      err.statusCode = 404;
      throw err;
    }

    const fromStageId = lot.stage_id ?? null;

    // ✅ evita evento duplicado (mover pro mesmo stage)
    if (fromStageId && fromStageId === body.toStageId) {
      const err: any = new Error("O lote já está neste estágio.");
      err.statusCode = 400;
      throw err;
    }

    // 2) valida stage destino pertence ao tenant
    const { data: stage, error: stErr } = await db
      .from("production_stages")
      .select("id, tenant_id, is_active")
      .eq("id", body.toStageId)
      .eq("tenant_id", auth.activeTenantId)
      .maybeSingle();

    if (stErr) throw stErr;
    if (!stage) throw new Error("Estágio de destino não encontrado.");
    if (stage.is_active === false) {
      const err: any = new Error("Estágio de destino está inativo.");
      err.statusCode = 400;
      throw err;
    }

    const meta = normalizeMeta(body.meta);

    // 3) atualiza lote primeiro (reduz chance de “evento criado mas lote não mudou”)
    const { error: upErr } = await db
      .from("lots")
      .update({ stage_id: body.toStageId, updated_at: new Date().toISOString() })
      .eq("id", lotId)
      .eq("tenant_id", auth.activeTenantId);

    if (upErr) throw upErr;

    // 4) cria evento
    const { data: ev, error: evErr } = await db
      .from("lot_stage_events")
      .insert({
        tenant_id: auth.activeTenantId,
        lot_id: lotId,
        from_stage_id: fromStageId,
        to_stage_id: body.toStageId,
        event_date: body.eventDate,
        notes: body.notes ?? null,
        meta,
      })
      .select("*")
      .single();

    if (evErr) throw evErr;

    // ✅ garante retorno com meta normalizado
    const item: LotStageEventRow = {
      ...(ev as any),
      meta: normalizeMeta((ev as any)?.meta),
    };

    return { item };
  }

  async function listLotStageEvents(auth: Auth, lotId: string) {
    const { data, error } = await db
      .from("lot_stage_events")
      .select("*")
      .eq("tenant_id", auth.activeTenantId)
      .eq("lot_id", lotId)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const items: LotStageEventRow[] = (data ?? []).map((r: any) => ({
      ...(r as any),
      meta: normalizeMeta(r?.meta),
    }));

    return { items };
  }

  // =========================
  // KANBAN (STAGES + LOTS)
  // =========================
  async function getProductionKanban(
    auth: Auth,
    params: {
      chain: string;
      purpose?: string | null;
    }
  ) {
    // 1) busca estágios
    let stagesQuery = db
      .from("production_stages")
      .select("*")
      .eq("tenant_id", auth.activeTenantId)
      .eq("chain", params.chain)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (params.purpose !== undefined) {
      stagesQuery =
        params.purpose === null
          ? stagesQuery.is("purpose", null)
          : stagesQuery.eq("purpose", params.purpose);
    }

    const { data: stages, error: stErr } = await stagesQuery;
    if (stErr) throw stErr;

    const stageIds = (stages ?? []).map((s: any) => s.id);

    // se não tiver estágio cadastrado, devolve vazio (sem erro)
    if (!stageIds.length) {
      return { columns: [] as Array<any> };
    }

    // 2) busca lotes vinculados aos estágios
    const { data: lots, error: lotErr } = await db
      .from("lots")
      .select("id, name, code, species, qty, stage_id, updated_at")
      .eq("tenant_id", auth.activeTenantId)
      .in("stage_id", stageIds)
      .order("updated_at", { ascending: false });

    if (lotErr) throw lotErr;

    // 3) agrupa lotes por estágio
    const lotsByStage: Record<string, any[]> = {};
    for (const st of stages ?? []) {
      lotsByStage[(st as any).id] = [];
    }

    for (const lot of lots ?? []) {
      const sid = (lot as any).stage_id as string | null;
      if (sid && lotsByStage[sid]) {
        lotsByStage[sid].push({
          id: (lot as any).id,
          name: (lot as any).name ?? null,
          code: (lot as any).code ?? null,
          species: (lot as any).species ?? null,
          qty: (lot as any).qty ?? null,
          stageId: sid,
          updatedAt: (lot as any).updated_at,
        });
      }
    }

    // 4) monta colunas
    const columns = (stages ?? []).map((st: any) => ({
      id: st.id,
      name: st.name,
      code: st.code,
      isTerminal: st.is_terminal,
      sortOrder: st.sort_order,
      lots: lotsByStage[st.id] ?? [],
    }));

    return { columns };
  }

  return {
    listStages,
    createStage,
    updateStage,
    moveLotToStage,
    listLotStageEvents,
    getProductionKanban,
  };
}
