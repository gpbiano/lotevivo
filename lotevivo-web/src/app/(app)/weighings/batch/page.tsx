"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

type Row = { animal_id: string; weight_kg: number | "" };

export default function BatchWeighingsPage() {
  const [weighedAt, setWeighedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([{ animal_id: "", weight_kg: "" }]);
  const [saving, setSaving] = useState(false);

  function addRow() {
    setRows((p) => [...p, { animal_id: "", weight_kg: "" }]);
  }

  function removeRow(idx: number) {
    setRows((p) => p.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((p) => p.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function onSave() {
    if (!weighedAt) return alert("Informe a data/hora (ISO).");

    const items = rows
      .filter((r) => r.animal_id && r.weight_kg !== "" && Number(r.weight_kg) > 0)
      .map((r) => ({ animal_id: r.animal_id, weight_kg: Number(r.weight_kg) }));

    if (!items.length) return alert("Adicione pelo menos um animal com peso.");

    setSaving(true);
    try {
      const data = await apiPost<any>(`/weighings/batch`, {
        weighed_at: weighedAt,
        notes: notes ? notes : null,
        items,
      });

      if (data?.errors?.length) {
        alert(`Salvou ${data.created} e teve ${data.errors.length} erros. Veja o console.`);
        console.log("Batch errors:", data.errors);
      } else {
        alert(`Pesagens salvas: ${data.created}`);
      }

      setRows([{ animal_id: "", weight_kg: "" }]);
      setNotes("");
    } catch (e: any) {
      alert(e?.message ?? "Erro ao salvar pesagens");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pesagem em lote</h1>
        <p className="text-sm text-muted-foreground">
          Lance várias pesagens de uma vez e o GMD será calculado automaticamente.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data/hora (ISO)</label>
            <input
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
              placeholder="2026-01-04T10:00:00Z"
              value={weighedAt}
              onChange={(e) => setWeighedAt(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Observação</label>
            <input
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-medium">Animais</h2>
          <button onClick={addRow} className="rounded-xl border px-3 py-2 text-sm hover:bg-accent">
            + Adicionar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left py-2 pr-3">Animal ID</th>
                <th className="text-left py-2 pr-3">Peso (kg)</th>
                <th className="py-2 w-[120px]"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-b last:border-b-0">
                  <td className="py-2 pr-3">
                    <input
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                      placeholder="uuid do animal"
                      value={r.animal_id}
                      onChange={(e) => updateRow(idx, { animal_id: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                      type="number"
                      step="0.1"
                      value={r.weight_kg}
                      onChange={(e) => updateRow(idx, { weight_kg: e.target.value === "" ? "" : Number(e.target.value) })}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => removeRow(idx)}
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-accent disabled:opacity-60"
                      disabled={rows.length === 1 || saving}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar pesagens"}
        </button>
      </div>
    </div>
  );
}
