// src/app/(app)/production/kanban/page.tsx

import KanbanBoard from "@/components/production/KanbanBoard";

export default function ProductionKanbanPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-lv-border bg-lv-surface/80 backdrop-blur p-4 md:p-6 shadow-soft">
        <h1 className="text-lg font-semibold text-lv-fg">Produção • Aves</h1>
        <p className="text-sm text-lv-muted">
          Acompanhe os lotes por estágio de produção
        </p>
      </div>

      <KanbanBoard />
    </div>
  );
}
