"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";

/* =========================
   UI HELPERS
========================= */
function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-lg font-semibold text-lv-fg">{title}</h1>
        {subtitle && <p className="text-sm text-lv-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-lv-border bg-lv-surface/85 backdrop-blur shadow-soft">
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-lv-fg">{label}</label>
      {children}
    </div>
  );
}

/* =========================
   PAGE
========================= */
export default function NewLotPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("cattle");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) return;

    setLoading(true);
    try {
      await apiPost("/lots", {
        name: name.trim(),
        species,
        notes: notes.trim() || null,
      });

      router.replace("/lots");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Erro ao criar lote");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Novo lote"
        subtitle="Crie um lote para organizar os animais do criatório."
        actions={
          <Link
            href="/lots"
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
          >
            Voltar
          </Link>
        }
      />

      <form onSubmit={onSubmit} className="space-y-5">
        <Card>
          <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome do lote">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Matrizes 2025"
                disabled={loading}
                className="w-full rounded-xl border border-lv-border bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-lv-green/20"
              />
            </Field>

            <Field label="Espécie">
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-lv-border bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-lv-green/20"
              >
                <option value="cattle">Bovinos</option>
                <option value="poultry">Aves</option>
                <option value="swine">Suínos</option>
                <option value="sheep">Ovinos</option>
                <option value="goat">Caprinos</option>
                <option value="horse">Equinos</option>
              </select>
            </Field>

            <div className="md:col-span-2">
              <Field label="Observações (opcional)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  disabled={loading}
                  placeholder="Informações adicionais sobre o lote"
                  className="w-full rounded-xl border border-lv-border bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-lv-green/20"
                />
              </Field>
            </div>

            {error && (
              <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </Card>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className={[
              "rounded-xl px-4 py-2 text-sm font-medium text-white transition",
              canSubmit
                ? "bg-lv-green hover:bg-lv-green/90 shadow-[0_10px_20px_rgba(15,82,50,0.18)]"
                : "bg-lv-green/40 cursor-not-allowed",
            ].join(" ")}
          >
            {loading ? "Salvando..." : "Criar lote"}
          </button>

          <Link
            href="/lots"
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
