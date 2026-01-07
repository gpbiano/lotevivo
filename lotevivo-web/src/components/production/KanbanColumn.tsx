import KanbanCard from "./KanbanCard";

export default function KanbanColumn({ column }: any) {
  return (
    <div className="min-w-[280px] max-w-[280px] flex flex-col gap-3">
      {/* Header */}
      <div className="rounded-2xl border border-lv-border bg-white/70 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-lv-fg">
            {column.name}
          </span>
          <span className="text-xs text-lv-muted">
            {column.lots.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {column.lots.map((lot: any) => (
          <KanbanCard key={lot.id} lot={lot} />
        ))}
      </div>
    </div>
  );
}
