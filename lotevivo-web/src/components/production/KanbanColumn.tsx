"use client";

import KanbanCard from "./KanbanCard";

export default function KanbanColumn({
  column,
  onLotMoved,
  onReload,
}: {
  column: any;
  onLotMoved?: (lotId: string, toStageId: string | null) => void;
  onReload?: () => Promise<void>;
}) {
  return (
    <div className="rounded-3xl border border-lv-border bg-white/55 backdrop-blur p-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-lv-fg">{column.name}</span>
        <span className="text-xs text-lv-muted">{column.lots?.length ?? 0}</span>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {(column.lots ?? []).map((lot: any) => (
          <KanbanCard key={lot.id} lot={lot} onLotMoved={onLotMoved} onReload={onReload} />
        ))}
      </div>
    </div>
  );
}
