"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";

type ProductionStage = {
  id: string;
  chain: string;
  purpose: string | null;
  name: string;
  code: string;
  sort_order: number;
  is_terminal: boolean;
  is_active: boolean;
};

type Lot = {
  id: string;
  tenant_id: string;

  name?: string | null;
  code?: string | null;

  species?: string | null;
  breed?: string | null;

  chain?: string | null;
  purpose?: string | null;
  entry_type?: string | null;

  stage_id?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

type StagesResponse = { items: ProductionStage[] };
type LotsResponse = { items: Lot[] };

// Se você tiver uma rota pronta pro inventory_balance_view, essa tela usa.
// Se não tiver, ela segue funcionando e mostra "—".
type InventoryBalanceRow = {
  lot_id: string;
  qty: number;
};
type InventoryBalanceResponse = { items: InventoryBalanceRow[] };

function todayIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeIsoDateFromTs(ts?: string | null) {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysBetweenIso(aIso: string, bIso: string) {
  // aIso - bIso (em dias)
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  const diff = (a - b) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
}

function IconEgg() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22c4.2 0 8-3.3 8-8.8C20 7.4 16.9 2 12 2S4 7.4 4 13.2C4 18.7 7.8 22 12 22Z" />
    </svg>
  );
}

function IconColumns() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5h6v14H4zM14 5h6v14h-6z" />
    </svg>
  );
}

function IconMove() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 9l-3 3 3 3" />
      <path d="M2 12h9" />
      <path d="M19 9l3 3-3 3" />
      <path d="M22 12h-9" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.4h3.4L22 19.8H2L10.3 3.4z" />
    </svg>
  );
}

function IconSkull() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3c-4.4 0-8 3.1-8 7 0 2.4 1.4 4.6 3.6 5.9V20h2v-2h5v2h2v-4.1C18.6 14.6 20 12.4 20 10c0-3.9-3.6-7-8-7z" />
      <path d="M9 11h.01M15 11h.01" />
    </svg>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-lv-border bg-white/70 px-2.5 py-1 text-[11px] text-lv-muted">
      {children}
    </span>
  );
}

function Badge({ children, kind }: { children: React.ReactNode; kind: "ok" | "warn" }) {
  const cls =
    kind === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-lv-border bg-white/70 text-lv-muted";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-lv-border bg-white/60 p-3">
      <div className="h-3 w-2/3 rounded bg-black/10" />
      <div className="mt-2 h-3 w-1/2 rounded bg-black/10" />
      <div className="mt-3 h-7 w-full rounded-xl bg-black/10" />
    </div>
  );
}

type DragPayload = {
  lotId: string;
  fromStageId: string | null;
};

type MoveModalState = {
  open: boolean;
  lot: Lot | null;
  fromStage: ProductionStage | null;
  toStage: ProductionStage | null;

  eventDate: string;
  notes: string;

  saving: boolean;
  error: string | null;
};

export default function AvesKanbanPage() {
  const [purpose, setPurpose] = useState<"POSTURA" | "CORTE">("POSTURA");
  const [loading, setLoading] = useState(true);

  const [stages, setStages] = useState<ProductionStage[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [error, setError] = useState<string | null>(null);

  // (1) saldo/quantidade por lote
  const [lotQty, setLotQty] = useState<Record<string, number>>({});

  // (2) data de entrada no estágio (para “dias no estágio”)
  // por enquanto: fallback = created_at do lote (e depois, com API de eventos em lote, fica perfeito)
  const [lotStageEnteredAt, setLotStageEnteredAt] = useState<Record<string, string>>({}); // lotId -> YYYY-MM-DD

  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);

  const [moveModal, setMoveModal] = useState<MoveModalState>({
    open: false,
    lot: null,
    fromStage: null,
    toStage: null,
    eventDate: todayIsoDate(),
    notes: "",
    saving: false,
    error: null,
  });

  const stageById = useMemo(() => {
    const map = new Map<string, ProductionStage>();
    for (const s of stages) map.set(s.id, s);
    return map;
  }, [stages]);

  const stageByCode = useMemo(() => {
    const map = new Map<string, ProductionStage>();
    for (const s of stages) map.set(String(s.code || "").toUpperCase(), s);
    return map;
  }, [stages]);

  async function loadBalancesMaybe(currentLots: Lot[]) {
    // ✅ tenta carregar via rota (se existir). Se não existir, segue.
    try {
      // Ajuste se sua rota tiver outro path.
      // Sugestão backend: GET /inventory/balance?groupBy=lot
      const res = (await apiGet(`/inventory/balance?groupBy=lot`)) as InventoryBalanceResponse;
      const map: Record<string, number> = {};
      for (const r of res.items ?? []) {
        if (r?.lot_id) map[r.lot_id] = Number(r.qty ?? 0);
      }
      setLotQty(map);
    } catch {
      // fallback: tenta derivar por lot.current_qty se existir futuramente
      const map: Record<string, number> = {};
      for (const l of currentLots) {
        // @ts-ignore
        const q = (l as any).qty_current;
        if (q !== undefined && q !== null && Number.isFinite(Number(q))) {
          map[l.id] = Number(q);
        }
      }
      setLotQty(map);
    }
  }

  function primeStageEnteredAt(currentLots: Lot[]) {
    // fallback = created_at (ou updated_at) — depois a gente troca para a data do último evento do lote
    const map: Record<string, string> = {};
    for (const l of currentLots) {
      const fallback = safeIsoDateFromTs(l.updated_at ?? null) || safeIsoDateFromTs(l.created_at ?? null);
      if (fallback) map[l.id] = fallback;
    }
    setLotStageEnteredAt(map);
  }

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const stagesRes = (await apiGet(`/production/stages?chain=AVES&purpose=${purpose}`)) as StagesResponse;

      let lotsRes: LotsResponse;
      try {
        lotsRes = (await apiGet(`/lots?chain=AVES&purpose=${purpose}`)) as LotsResponse;
      } catch {
        lotsRes = (await apiGet(`/lots`)) as LotsResponse;
      }

      const sorted = (stagesRes.items ?? [])
        .filter((s) => s.is_active)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      const lotsItems = lotsRes.items ?? [];

      setStages(sorted);
      setLots(lotsItems);

      // (1) saldo por lote
      await loadBalancesMaybe(lotsItems);

      // (2) “dias no estágio” (fallback por enquanto)
      primeStageEnteredAt(lotsItems);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purpose]);

  const filteredLots = useMemo(() => {
    // se backend não filtrar, filtramos no client
    return lots.filter((l) => {
      const chainOk = !l.chain || l.chain === "AVES";
      const purposeOk = !l.purpose || l.purpose === purpose;
      return chainOk && purposeOk;
    });
  }, [lots, purpose]);

  const lotsByStage = useMemo(() => {
    const map = new Map<string, Lot[]>();
    for (const s of stages) map.set(s.id, []);

    for (const l of filteredLots) {
      const sid = l.stage_id ?? "";
      if (!sid) continue;
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(l);
    }

    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
      map.set(k, arr);
    }

    return map;
  }, [filteredLots, stages]);

  function openMoveModal(lotId: string, toStageId: string) {
    const lot = filteredLots.find((l) => l.id === lotId) ?? null;
    const toStage = stageById.get(toStageId) ?? null;
    const fromStage = lot?.stage_id ? stageById.get(lot.stage_id) ?? null : null;

    if (!lot || !toStage) return;
    if ((lot.stage_id ?? null) === toStageId) return;

    setMoveModal({
      open: true,
      lot,
      fromStage,
      toStage,
      eventDate: todayIsoDate(),
      notes: "",
      saving: false,
      error: null,
    });
  }

  function closeMoveModal() {
    setMoveModal((m) => ({ ...m, open: false, error: null, saving: false }));
  }

  async function confirmMove(extraMeta?: Record<string, any>) {
    if (!moveModal.lot || !moveModal.toStage) return;

    setMoveModal((m) => ({ ...m, saving: true, error: null }));

    const lotId = moveModal.lot.id;
    const toStageId = moveModal.toStage.id;

    // otimista
    const prevLots = lots;
    setLots((curr) => curr.map((l) => (l.id === lotId ? { ...l, stage_id: toStageId } : l)));

    // (2) atualiza “data de entrada no estágio” localmente com a data do evento
    setLotStageEnteredAt((curr) => ({ ...curr, [lotId]: moveModal.eventDate }));

    try {
      await apiPost(`/lots/${lotId}/stage`, {
        toStageId,
        eventDate: moveModal.eventDate,
        notes: moveModal.notes?.trim() ? moveModal.notes.trim() : null,
        meta: {
          ui: "kanban",
          chain: "AVES",
          purpose,
          ...(extraMeta ?? {}),
        },
      });

      closeMoveModal();
    } catch (e: any) {
      // rollback
      setLots(prevLots);
      setMoveModal((m) => ({
        ...m,
        saving: false,
        error: e?.message ?? "Erro ao mover lote.",
      }));
    }
  }

  function onDragStart(lotId: string, fromStageId: string | null) {
    setDragging({ lotId, fromStageId });
  }

  function onDragEnd() {
    setDragging(null);
    setOverStageId(null);
  }

  // (3) ação rápida: baixa/perda (move para FINALIZADO ou BAIXA se existir)
  function quickLoss(lotId: string) {
    const lot = filteredLots.find((l) => l.id === lotId);
    if (!lot) return;

    const terminal =
      stageByCode.get("BAIXA") ||
      stageByCode.get("FINALIZADO") ||
      stages.find((s) => s.is_terminal) ||
      null;

    if (!terminal) {
      setError("Não encontrei um estágio terminal (FINALIZADO/BAIXA). Rode o seed ou crie um estágio terminal.");
      return;
    }

    // abre modal já apontando para o terminal
    setMoveModal({
      open: true,
      lot,
      fromStage: lot.stage_id ? stageById.get(lot.stage_id) ?? null : null,
      toStage: terminal,
      eventDate: todayIsoDate(),
      notes: "Baixa/Perda registrada.",
      saving: false,
      error: null,
    });
  }

  // (3) ação rápida: transferir (abre modal com seletor de destino)
  function quickTransfer(lotId: string) {
    const lot = filteredLots.find((l) => l.id === lotId);
    if (!lot) return;

    // default: move para próxima coluna (se existir)
    const currentIdx = stages.findIndex((s) => s.id === lot.stage_id);
    const next = currentIdx >= 0 && currentIdx < stages.length - 1 ? stages[currentIdx + 1] : null;

    setMoveModal({
      open: true,
      lot,
      fromStage: lot.stage_id ? stageById.get(lot.stage_id) ?? null : null,
      toStage: next ?? (lot.stage_id ? stageById.get(lot.stage_id) ?? null : null),
      eventDate: todayIsoDate(),
      notes: "",
      saving: false,
      error: null,
    });
  }

  const today = todayIsoDate();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-lv-fg">Produção • Aves</h1>
          <p className="text-sm text-lv-muted">Kanban por estágio do lote (arraste e solte para mover).</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-2xl border border-lv-border bg-white/70 p-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/70 ring-1 ring-lv-border">
              <IconEgg />
            </span>

            <div className="pr-2">
              <div className="text-[11px] text-lv-muted leading-tight">Finalidade</div>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as any)}
                className="mt-0.5 h-8 rounded-xl bg-white/70 px-2 text-sm ring-1 ring-lv-border outline-none"
              >
                <option value="POSTURA">Postura</option>
                <option value="CORTE">Corte</option>
              </select>
            </div>
          </div>

          <button
            onClick={load}
            className="h-11 px-4 rounded-2xl text-sm bg-white/70 ring-1 ring-lv-border hover:bg-white/90 transition inline-flex items-center gap-2"
          >
            <IconColumns />
            Atualizar
          </button>

          <Link
            href="/lots/new"
            className="h-11 px-4 rounded-2xl text-sm bg-lv-green text-white hover:bg-lv-green/90 transition inline-flex items-center justify-center"
          >
            + Novo lote
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {/* Board */}
      <div className="rounded-3xl border border-lv-border bg-lv-surface/60 backdrop-blur p-4">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-lv-border bg-white/50 p-3">
                <div className="h-4 w-2/3 rounded bg-black/10" />
                <div className="mt-3 space-y-3">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              </div>
            ))}
          </div>
        ) : stages.length === 0 ? (
          <div className="rounded-2xl border border-lv-border bg-white/60 p-5 text-sm text-lv-muted">
            Nenhum estágio encontrado para <b>AVES / {purpose}</b>. Rode o seed de estágios no banco.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {stages.map((stage) => {
              const items = lotsByStage.get(stage.id) ?? [];
              const isOver = overStageId === stage.id;

              return (
                <div key={stage.id} className="min-w-[280px] max-w-[320px] w-[320px] flex-shrink-0">
                  <div
                    className={[
                      "rounded-2xl border p-3 transition",
                      isOver ? "border-lv-green bg-lv-green/5" : "border-lv-border bg-white/60",
                    ].join(" ")}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOverStageId(stage.id);
                    }}
                    onDragLeave={() => setOverStageId((cur) => (cur === stage.id ? null : cur))}
                    onDrop={(e) => {
                      e.preventDefault();
                      const lotId = e.dataTransfer.getData("text/lotId");
                      if (!lotId) return;
                      openMoveModal(lotId, stage.id);
                      onDragEnd();
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-lv-fg">{stage.name}</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Pill>{stage.code}</Pill>
                          {stage.is_terminal ? <Pill>final</Pill> : <Pill>em andamento</Pill>}
                        </div>
                      </div>

                      <div className="text-xs text-lv-muted">
                        <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-xl bg-white/70 ring-1 ring-lv-border px-2">
                          {items.length}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-3">
                      {items.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-lv-border bg-white/40 p-3 text-xs text-lv-muted">
                          Arraste um lote para cá.
                        </div>
                      ) : (
                        items.map((lot) => {
                          // (1) quantidade
                          const qty = lotQty[lot.id];
                          const qtyLabel = qty === undefined ? "—" : String(qty);

                          // (2) dias no estágio
                          const enteredAt = lotStageEnteredAt[lot.id] || safeIsoDateFromTs(lot.updated_at ?? null) || safeIsoDateFromTs(lot.created_at ?? null);
                          const days = enteredAt ? Math.max(0, daysBetweenIso(today, enteredAt) * -1) : null;
                          // acima: daysBetweenIso(today, enteredAt) retorna negativo se today > enteredAt, por isso inverti
                          const daysInStage =
                            enteredAt ? Math.max(0, daysBetweenIso(todayIsoDate(), enteredAt)) : null;

                          // regra simples de alerta (ajusta depois por estágio)
                          const warn = daysInStage !== null && daysInStage >= 14 && !stage.is_terminal;

                          return (
                            <div
                              key={lot.id}
                              draggable
                              onDragStart={(e) => {
                                onDragStart(lot.id, lot.stage_id ?? null);
                                e.dataTransfer.setData("text/lotId", lot.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={onDragEnd}
                              className={[
                                "rounded-2xl border bg-white/70 p-3 transition",
                                "border-lv-border hover:bg-white/90",
                                dragging?.lotId === lot.id ? "opacity-70" : "",
                              ].join(" ")}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <Link href={`/lots/${lot.id}`} className="min-w-0">
                                  <div className="text-sm font-semibold text-lv-fg truncate">
                                    {lot.name || lot.code || "Lote"}
                                  </div>
                                  <div className="mt-1 text-xs text-lv-muted truncate">
                                    {lot.breed ? `Raça: ${lot.breed}` : "Raça: —"}{" "}
                                    {lot.entry_type ? `• Entrada: ${lot.entry_type}` : ""}
                                  </div>
                                </Link>

                                <span className="h-2 w-2 rounded-full bg-lv-green mt-1" />
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Pill>{lot.species || "AVES"}</Pill>
                                <Pill>{purpose}</Pill>
                                <Pill>Qtd: {qtyLabel}</Pill>

                                {daysInStage !== null ? (
                                  <Badge kind={warn ? "warn" : "ok"}>
                                    {warn ? <IconAlert /> : null}
                                    {daysInStage}d no estágio
                                  </Badge>
                                ) : (
                                  <Badge kind="ok">tempo: —</Badge>
                                )}
                              </div>

                              {/* (3) Ações rápidas */}
                              <div className="mt-3 flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1 text-[11px] text-lv-muted">
                                  <IconMove /> arraste para mover
                                </span>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => quickTransfer(lot.id)}
                                    className="h-8 px-3 rounded-xl text-xs bg-white/70 ring-1 ring-lv-border hover:bg-white transition"
                                  >
                                    Transferir
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => quickLoss(lot.id)}
                                    className="h-8 px-3 rounded-xl text-xs bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100 transition inline-flex items-center gap-1"
                                  >
                                    <IconSkull /> Baixa
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-xs text-lv-muted">
        Próximo upgrade: buscar a data real do último evento por lote (e não usar fallback do created/updated).
      </div>

      {/* Modal */}
      {moveModal.open && moveModal.lot ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => (moveModal.saving ? null : closeMoveModal())} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-3xl border border-lv-border bg-white/90 backdrop-blur p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-lv-fg">Mover lote</div>
                  <div className="text-xs text-lv-muted mt-1">
                    Confirme a mudança de estágio e registre a data do evento.
                  </div>
                </div>

                <button
                  onClick={() => (moveModal.saving ? null : closeMoveModal())}
                  className="h-9 w-9 rounded-2xl bg-white/70 ring-1 ring-lv-border hover:bg-white transition"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-lv-border bg-white/70 p-4">
                <div className="text-sm font-semibold text-lv-fg truncate">
                  {moveModal.lot.name || moveModal.lot.code || "Lote"}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill>de: {moveModal.fromStage?.name ?? "—"}</Pill>
                  <Pill>para: {moveModal.toStage?.name ?? "—"}</Pill>
                  <Pill>{purpose}</Pill>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] text-lv-muted">Data do evento</div>
                    <input
                      type="date"
                      value={moveModal.eventDate}
                      onChange={(e) => setMoveModal((m) => ({ ...m, eventDate: e.target.value }))}
                      className="mt-1 h-11 w-full rounded-2xl bg-white/70 px-3 text-sm ring-1 ring-lv-border outline-none"
                      disabled={moveModal.saving}
                    />
                  </div>

                  <div>
                    <div className="text-[11px] text-lv-muted">Destino</div>
                    <select
                      value={moveModal.toStage?.id ?? ""}
                      onChange={(e) => {
                        const st = stageById.get(e.target.value) ?? null;
                        setMoveModal((m) => ({ ...m, toStage: st }));
                      }}
                      className="mt-1 h-11 w-full rounded-2xl bg-white/70 px-3 text-sm ring-1 ring-lv-border outline-none"
                      disabled={moveModal.saving}
                    >
                      <option value="" disabled>
                        Selecione…
                      </option>
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-[11px] text-lv-muted">Observação</div>
                  <textarea
                    value={moveModal.notes}
                    onChange={(e) => setMoveModal((m) => ({ ...m, notes: e.target.value }))}
                    className="mt-1 min-h-[90px] w-full rounded-2xl bg-white/70 px-3 py-2 text-sm ring-1 ring-lv-border outline-none"
                    placeholder="Ex: transferido para o galpão 2, ajustes de manejo..."
                    disabled={moveModal.saving}
                  />
                </div>

                {moveModal.error ? (
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {moveModal.error}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={closeMoveModal}
                  disabled={moveModal.saving}
                  className="h-11 px-4 rounded-2xl text-sm bg-white/70 ring-1 ring-lv-border hover:bg-white transition disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  onClick={() => confirmMove({ action: "MOVE_STAGE" })}
                  disabled={moveModal.saving || !moveModal.eventDate || !moveModal.toStage?.id}
                  className="h-11 px-4 rounded-2xl text-sm bg-lv-green text-white hover:bg-lv-green/90 transition disabled:opacity-60"
                >
                  {moveModal.saving ? "Salvando..." : "Confirmar mudança"}
                </button>
              </div>

              <div className="mt-3 text-[11px] text-lv-muted">
                Isso cria um evento em <code className="px-1 py-0.5 rounded bg-black/5">lot_stage_events</code> e
                atualiza <code className="px-1 py-0.5 rounded bg-black/5">lots.stage_id</code>.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
