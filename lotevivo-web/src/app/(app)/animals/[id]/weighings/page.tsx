"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { apiGet, apiPost } from "@/lib/api";

// Recharts sem SSR
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });

type SeriesPoint = {
  date: string; // YYYY-MM-DD
  weight_kg: number;
  gmd_kg_day: number | null;
};

type SeriesResponse = {
  animal_id: string;
  series: SeriesPoint[];
  summary: {
    last_weight_kg: number | null;
    last_gmd_kg_day: number | null;
    trend: "up" | "down" | "flat" | "na";
  };
};

type WeighingItem = {
  id: string;
  weighed_at: string;
  weight_kg: number;
  delta_days: number | null;
  delta_weight_kg: number | null;
  gmd_kg_day: number | null;
};

type WeighingsResponse = {
  animal_id: string;
  items: WeighingItem[];
};

export default function AnimalWeighingsPage() {
  const params = useParams();
  const animalId = useMemo(() => String(params?.id ?? ""), [params]);

  const [loading, setLoading] = useState(false);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [summary, setSummary] = useState<SeriesResponse["summary"] | null>(null);
  const [items, setItems] = useState<WeighingItem[]>([]);

  const [weighedAt, setWeighedAt] = useState("");
  const [weightKg, setWeightKg] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  async function fetchAll() {
    if (!animalId) return;
    setLoading(true);
    try {
      const s = await apiGet(`/animals/${animalId}/weighings/series`) as SeriesResponse;
      setSeries(s.series ?? []);
      setSummary(s.summary ?? null);

      const l = await apiGet(`/animals/${animalId}/weighings?limit=100`) as WeighingsResponse;
      setItems(l.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function onCreateWeighing() {
    if (!animalId) return;

    if (!weighedAt || !weightKg) {
      alert("Preencha data/hora e peso.");
      return;
    }

    try {
      await apiPost(`/animals/${animalId}/weighings`, {
        weighed_at: weighedAt,
        weight_kg: Number(weightKg),
        notes: notes ? notes : null,
      });

      setWeighedAt("");
      setWeightKg("");
      setNotes("");
      await fetchAll();
    } catch (e: any) {
      alert(e?.message ?? "Erro ao salvar pesagem");
    }
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animalId]);

  const trendLabel =
    summary?.trend === "up"
      ? "⬆️ Subindo"
      : summary?.trend === "down"
      ? "⬇️ Caindo"
      : summary?.trend === "flat"
      ? "➖ Estável"
      : "—";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Pesagens</h1>
          <p className="text-sm text-muted-foreground">Animal: {animalId}</p>
        </div>
        <div className="text-sm text-muted-foreground">{loading ? "Carregando..." : ""}</div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard title="Peso atual (kg)" value={summary?.last_weight_kg ?? "—"} />
        <StatCard title="Último GMD (kg/dia)" value={summary?.last_gmd_kg_day ?? "—"} />
        <StatCard title="Tendência" value={trendLabel} />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Evolução (Peso x GMD)</h2>
          <span className="text-xs text-muted-foreground">{series.length ? `${series.length} pontos` : "Sem dados"}</span>
        </div>

        <div className="h-[340px] w-full">
          <ResponsiveContainer>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="weight_kg" dot={false} name="Peso (kg)" />
              <Line yAxisId="right" type="monotone" dataKey="gmd_kg_day" dot={false} name="GMD (kg/dia)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Nova pesagem */}
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <h2 className="font-medium">Nova pesagem</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Data/hora (ISO)">
            <input
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
              placeholder="2026-01-04T10:00:00Z"
              value={weighedAt}
              onChange={(e) => setWeighedAt(e.target.value)}
            />
          </Field>

          <Field label="Peso (kg)">
            <input
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </Field>

          <Field label="Observação">
            <input
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <button
          onClick={onCreateWeighing}
          className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Salvar pesagem
        </button>
      </div>

      {/* Histórico */}
      <div className="rounded-2xl border bg-card p-4">
        <h2 className="font-medium mb-3">Histórico</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left py-2 pr-3">Data</th>
                <th className="text-left py-2 pr-3">Peso (kg)</th>
                <th className="text-left py-2 pr-3">Δpeso</th>
                <th className="text-left py-2 pr-3">Dias</th>
                <th className="text-left py-2 pr-3">GMD</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3">{new Date(it.weighed_at).toLocaleString()}</td>
                  <td className="py-2 pr-3">{it.weight_kg}</td>
                  <td className="py-2 pr-3">{it.delta_weight_kg ?? "—"}</td>
                  <td className="py-2 pr-3">{it.delta_days ?? "—"}</td>
                  <td className="py-2 pr-3">{it.gmd_kg_day ?? "—"}</td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    Nenhuma pesagem registrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
