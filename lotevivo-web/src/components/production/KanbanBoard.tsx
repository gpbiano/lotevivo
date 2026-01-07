"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { apiGet } from "@/lib/api";
import KanbanColumn from "@/components/production/KanbanColumn";

type Stage = {
  id: string;
  name: string;
  code: string;
  sort_order: number;
  is_terminal: boolean;
  is_active: boolean;
  chain: string;
  purpose: string | null;
};

type Lot = {
  id: string;
  name: string;
  species?: string | null;
  quantity?: number | null;
  qty?: number | null;
  stage_id?: string | null;
};

type Column = {
  id: string;
  name: string;
  lots: Lot[];
  isSynthetic?: boolean;
};

export default function KanbanBoard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [stages, setStages] = useState<Stage[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);

  const chain = "aves";
  const purpose: string | undefined = undefined;

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const qs = new URLSearchParams({ chain });
      if (purpose) qs.set("purpose", purpose);

      const stagesRes = (await apiGet(`/production/stages?${qs.toString()}`)) as {
        items: Stage[];
      };

      const lotsRes = (await apiGet("/lots?limit=500")) as { items: Lot[] } | Lot[];
      const lotsItems = Array.isArray(lotsRes) ? lotsRes : lotsRes.items;

      setStages((stagesRes?.items ?? []).filter(Boolean));
      setLots((lotsItems ?? []).filter(Boolean));
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao carregar o Kanban");
    } finally {
      setLoading(false);
    }
  }, [chain, purpose]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await reload();
    })();
    return () => {
      mounted = false;
    };
  }, [reload]);

  // ✅ atualiza lote localmente assim que mover
  const onLotMoved = useCallback((lotId: string, toStageId: string | null) => {
    setLots((prev) =>
      (prev ?? []).map((l) => (l.id === lotId ? { ...l, stage_id: toStageId } : l))
    );
  }, []);

  const columns: Column[] = useMemo(() => {
    const stageItems = [...(stages ?? [])].sort(
      (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
    );

    const normalizedLots: Lot[] = (lots ?? []).map((l) => ({
      ...l,
      quantity:
        l.quantity !== undefined && l.quantity !== null
          ? l.quantity
          : l.qty !== undefined && l.qty !== null
            ? l.qty
            : null,
    }));

    const cols: Column[] = stageItems.map((s) => ({
      id: s.id,
      name: s.name,
      lots: normalizedLots.filter((lot) => (lot.stage_id ?? null) === s.id),
    }));

    const withoutStage = normalizedLots.filter((lot) => !lot.stage_id);
    if (withoutStage.length > 0) {
      cols.unshift({
        id: "no-stage",
        name: "Sem estágio",
        lots: withoutStage,
        isSynthetic: true,
      });
    }

    return cols;
  }, [stages, lots]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-lv-border bg-white/60 p-6 text-sm text-lv-muted">
        Carregando Kanban...
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {err}
      </div>
    );
  }

  if (!columns.length) {
    return (
      <div className="rounded-3xl border border-lv-border bg-white/60 p-6 text-sm text-lv-muted">
        Nenhum estágio cadastrado ainda.
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-gutter:stable]">
        {columns.map((col) =>
          col ? (
            <div key={col.id} className="min-w-[280px] max-w-[320px] w-[300px] shrink-0">
              <KanbanColumn column={col as any} onLotMoved={onLotMoved} onReload={reload} />
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
