"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { apiGet, apiPost } from "@/lib/api";

type Stage = { id: string; name: string };
type LotEvent = {
  id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  event_date: string;
  notes: string | null;
};

function toISODate(d: Date) {
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
  const [mounted, setMounted] = useState(false);

  const [stages, setStages] = useState<Stage[]>([]);
  const [events, setEvents] = useState<LotEvent[]>([]);

  const [toStageId, setToStageId] = useState<string>("");
  const [eventDate, setEventDate] = useState<string>(toISODate(new Date()));
  const [notes, setNotes] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // --- Portal mount
  useEffect(() => setMounted(true), []);

  // --- ESC fecha + trava scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // --- Load
  useEffect(() => {
    let alive = true;

    async function load() {
      setErr(null);
      try {
        // Ajuste chain/purpose conforme teu backend (aqui está em aves)
        const stagesRes = (await apiGet(`/production/stages?chain=aves`)) as {
          items: { id: string; name: string }[];
        };

        const evRes = (await apiGet(`/lots/${lotId}/stage-events`)) as {
          items: LotEvent[];
        };

        if (!alive) return;

        const stageItems = (stagesRes?.items ?? []).filter(Boolean);
        setStages(stageItems);

        const evItems = (evRes?.items ?? []).filter(Boolean);
        setEvents(evItems);

        // sugestão default: estágio atual do lote, senão primeiro estágio
        const current = lot?.stage_id ?? "";
        const fallback = stageItems?.[0]?.id ?? "";
        setToStageId(current || fallback);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Erro ao carregar detalhes do lote");
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [lotId, lot?.stage_id]);

  const stageNameById = useMemo(() => {
    const m = new Map<string, string>();
    stages.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [stages]);

  async function onMove() {
    setSaving(true);
    setErr(null);

    try {
      await apiPost(`/lots/${lotId}/stage`, {
        toStageId,
        eventDate,
        notes: notes?.trim() || null,
        meta: {},
      });

      // Recarrega eventos
      const evRes = (await apiGet(`/lots/${lotId}/stage-events`)) as {
        items: LotEvent[];
      };
      setEvents((evRes?.items ?? []).filter(Boolean));

      // ✅ Se teu Kanban depende do stage_id do lote na lista,
      // o ideal é o backend retornar o lote atualizado OU o front recarregar o Kanban.
      // Aqui pelo menos garantimos o histórico atualizado.
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao mover lote de estágio");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* overlay */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-3xl border border-lv-border bg-white/90 shadow-[0_30px_120px_rgba(0,0,0,0.25)] backdrop-blur">
          {/* header */}
          <div className="flex items-start justify-between gap-3 border-b border-lv-border p-5">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-lv-fg truncate">
                {lot?.name ?? "Lote"}
              </div>
              <div className="text-xs text-lv-muted">
                Quantidade: <span className="text-lv-fg">{lot?.quantity ?? lot?.qty ?? "—"}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-lv-border bg-white/70 px-3 py-1.5 text-sm hover:bg-white"
            >
              Fechar
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* mover */}
            <div className="rounded-2xl border border-lv-border bg-white/70 p-4">
              <div className="text-sm font-semibold text-lv-fg">Mover de estágio</div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_180px_170px] gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-lv-muted">Destino</div>
                  <select
                    value={toStageId}
                    onChange={(e) => setToStageId(e.target.value)}
                    className="w-full rounded-xl border border-lv-border bg-white/80 px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-emerald-100"
                  >
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-lv-muted">Data do evento</div>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-xl border border-lv-border bg-white/80 px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={onMove}
                    disabled={saving || !toStageId}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving ? "Movendo..." : "Mover"}
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <div className="text-xs text-lv-muted">Observações</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Opcional..."
                  className="min-h-[64px] w-full rounded-xl border border-lv-border bg-white/80 px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* histórico */}
            <div className="rounded-2xl border border-lv-border bg-white/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-lv-fg">Histórico</div>
                  <div className="text-xs text-lv-muted">Eventos de estágio deste lote</div>
                </div>
                <div className="text-xs text-lv-muted">{events.length} evento(s)</div>
              </div>

              <div className="mt-3 space-y-2">
                {events.length === 0 ? (
                  <div className="text-sm text-lv-muted">Nenhum evento ainda.</div>
                ) : (
                  events.map((ev) => {
                    const fromName = ev.from_stage_id ? stageNameById.get(ev.from_stage_id) : null;
                    const toName = stageNameById.get(ev.to_stage_id) ?? "—";
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between rounded-2xl border border-lv-border bg-white/70 px-4 py-2.5"
                      >
                        <div className="text-sm text-lv-fg">
                          {fromName ? `${fromName} → ${toName}` : `— → ${toName}`}
                        </div>
                        <div className="text-xs text-lv-muted">
                          {ev.event_date?.split("-").reverse().join("/")}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {err ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {err}
              </div>
            ) : null}

            <div className="text-xs text-lv-muted">Dica: pressione Esc para fechar.</div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
