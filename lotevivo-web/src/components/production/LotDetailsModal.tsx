"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type Stage = {
  id: string;
  name: string;
  code: string;
  is_terminal?: boolean;
};

type LotStageEvent = {
  id: string;
  lot_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  event_date: string;
  notes: string | null;
  meta: Record<string, any>;
  created_at: string;
};

function formatDateBR(iso?: string | null) {
  if (!iso) return "-";
  // iso pode vir YYYY-MM-DD ou ISO completo
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("pt-BR");
}

function todayIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function LotDetailsModal({
  lotId,
  lot,
  onClose,
}: {
  lotId: string;
  lot: any;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [stages, setStages] = useState<Stage[]>([]);
  const [events, setEvents] = useState<LotStageEvent[]>([]);

  const [toStageId, setToStageId] = useState<string>("");
  const [eventDate, setEventDate] = useState<string>(todayIsoDate());
  const [notes, setNotes] = useState<string>("");

  const [error, setError] = useState<string | null>(null);

  const currentStageId = lot?.stageId ?? lot?.stage_id ?? null;
  const chain = "aves"; // ✅ por enquanto fixo (produção aves)

  const stageMap = useMemo(() => {
    const m: Record<string, Stage> = {};
    for (const s of stages) m[s.id] = s;
    return m;
  }, [stages]);

  const currentStageName = currentStageId ? (stageMap[currentStageId]?.name ?? "-") : "-";

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [st, ev] = await Promise.all([
          apiGet(`/production/stages?chain=${encodeURIComponent(chain)}`),
          apiGet(`/lots/${lotId}/stage-events`),
        ]);

        if (!mounted) return;

        const itemsStages: Stage[] = (st?.items ?? []).map((x: any) => ({
          id: x.id,
          name: x.name,
          code: x.code,
          is_terminal: x.is_terminal ?? x.isTerminal ?? false,
        }));

        setStages(itemsStages);
        setEvents((ev?.items ?? []) as LotStageEvent[]);

        // default: próximo stage (se tiver), senão primeiro
        const idx = itemsStages.findIndex((s) => s.id === currentStageId);
        const next = idx >= 0 ? itemsStages[idx + 1] : itemsStages[0];
        setToStageId(next?.id ?? "");
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Erro ao carregar detalhes do lote.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [lotId, currentStageId]);

  async function onMoveStage() {
    if (!toStageId) {
      setError("Selecione o estágio de destino.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await apiPost(`/lots/${lotId}/stage`, {
        toStageId,
        eventDate,
        notes: notes?.trim() ? notes.trim() : null,
        meta: {},
      });

      // recarrega eventos
      const ev = await apiGet(`/lots/${lotId}/stage-events`);
      setEvents((ev?.items ?? []) as LotStageEvent[]);

      // opcional: feedback rápido
      setNotes("");
    } catch (e: any) {
      setError(e?.message ?? "Erro ao mover estágio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
        <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-lv-border bg-white/90 shadow-[0_30px_120px_rgba(0,0,0,0.22)] backdrop-blur">
          {/* header */}
          <div className="p-5 md:p-6 border-b border-lv-border bg-white/70">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-lv-fg truncate">
                  {lot?.name ?? "Lote"}
                </div>
                <div className="mt-1 text-xs text-lv-muted">
                  Estágio atual:{" "}
                  <span className="text-lv-fg/80 font-medium">{currentStageName}</span>
                  {lot?.qty != null ? (
                    <>
                      {" "}
                      • Quantidade:{" "}
                      <span className="text-lv-fg/80 font-medium">{lot.qty}</span>
                    </>
                  ) : null}
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-xl border border-lv-border bg-white px-3 py-1.5 text-xs text-lv-fg/80 hover:bg-white/80 transition"
              >
                Fechar
              </button>
            </div>
          </div>

          {/* body */}
          <div className="p-5 md:p-6 space-y-5">
            {loading ? (
              <div className="rounded-2xl border border-lv-border bg-lv-surface/70 p-4 text-sm text-lv-muted">
                Carregando detalhes...
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {/* mover estágio */}
            <div className="rounded-3xl border border-lv-border bg-lv-surface/70 p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-lv-fg">Mover estágio</div>
                  <div className="text-xs text-lv-muted">
                    Registre a mudança de estágio deste lote.
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="text-xs font-medium text-lv-muted">Destino</label>
                  <select
                    value={toStageId}
                    onChange={(e) => setToStageId(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-lv-border bg-white/80 px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300"
                  >
                    <option value="">Selecione…</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="text-xs font-medium text-lv-muted">Data do evento</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-lv-border bg-white/80 px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300"
                  />
                </div>

                <div className="md:col-span-1 flex items-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={onMoveStage}
                    className="w-full rounded-2xl bg-lv-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-lv-green/90 disabled:opacity-60 transition"
                  >
                    {saving ? "Salvando..." : "Mover"}
                  </button>
                </div>

                <div className="md:col-span-3">
                  <label className="text-xs font-medium text-lv-muted">Observações</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Opcional…"
                    rows={3}
                    className="mt-1 w-full resize-none rounded-2xl border border-lv-border bg-white/80 px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300"
                  />
                </div>
              </div>
            </div>

            {/* histórico */}
            <div className="rounded-3xl border border-lv-border bg-white/70 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-lv-fg">Histórico</div>
                  <div className="text-xs text-lv-muted">Eventos de estágio deste lote</div>
                </div>
                <span className="text-xs text-lv-muted">
                  {events.length} evento(s)
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {events.length === 0 ? (
                  <div className="text-sm text-lv-muted">
                    Nenhum evento registrado ainda.
                  </div>
                ) : (
                  events.map((ev) => {
                    const fromName = ev.from_stage_id
                      ? stageMap[ev.from_stage_id]?.name ?? "—"
                      : "—";
                    const toName = stageMap[ev.to_stage_id]?.name ?? "—";

                    return (
                      <div
                        key={ev.id}
                        className="rounded-2xl border border-lv-border bg-lv-surface/60 px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-lv-fg/90">
                            <span className="font-medium">{fromName}</span>{" "}
                            <span className="text-lv-muted">→</span>{" "}
                            <span className="font-medium">{toName}</span>
                          </div>
                          <div className="text-xs text-lv-muted">
                            {formatDateBR(ev.event_date)}
                          </div>
                        </div>

                        {ev.notes ? (
                          <div className="mt-1 text-xs text-lv-muted">
                            {ev.notes}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="p-4 md:p-5 border-t border-lv-border bg-white/60 text-[11px] text-lv-muted">
            Dica: pressione <span className="font-semibold text-lv-fg/80">Esc</span> para fechar.
          </div>
        </div>
      </div>
    </div>
  );
}
