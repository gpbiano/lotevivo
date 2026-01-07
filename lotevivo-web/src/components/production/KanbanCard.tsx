"use client";

import { useState } from "react";
import LotDetailsModal from "./LotDetailsModal";

type KanbanLot = {
  id: string;
  name: string;
  quantity?: number | null;
  species?: string | null;
};

export default function KanbanCard({ lot }: { lot: KanbanLot }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl border border-lv-border bg-lv-surface/80 p-3 shadow-soft hover:shadow-md transition"
      >
        {/* Nome do lote */}
        <div className="text-sm font-medium text-lv-fg truncate">
          {lot.name}
        </div>

        {/* Quantidade */}
        <div className="mt-1 text-xs text-lv-muted">
          Quantidade:{" "}
          <strong className="text-lv-fg">
            {lot.quantity ?? "—"}
          </strong>
        </div>

        {/* Espécie (opcional) */}
        {lot.species ? (
          <div className="mt-1 text-[11px] text-lv-muted truncate">
            Espécie:{" "}
            <span className="text-lv-fg/80">{lot.species}</span>
          </div>
        ) : null}
      </button>

      {open && (
        <LotDetailsModal
          lotId={lot.id}
          lot={lot}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
