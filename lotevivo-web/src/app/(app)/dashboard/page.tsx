"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getToken } from "@/lib/auth";

/* =======================
   Tipagens
======================= */

type Lot = {
  id: string;
  code: string;
  species: string;
  lot_type: string;
};

type Movement = {
  id: string;
  movement_type: string;
  movement_date: string;
  qty: number | null;
};

/* =======================
   Labels (UI em PT-BR)
======================= */

const speciesLabels: Record<string, string> = {
  CHICKEN: "Galinha",
  CATTLE: "Bovinos",
  PIG: "Suínos",
  SHEEP: "Ovinos",
  GOAT: "Caprinos",
  FISH: "Peixes",
};

const movementLabels: Record<string, string> = {
  ENTRY_PURCHASE: "Entrada (Compra)",
  SALE: "Venda",
  DEATH: "Morte",
  TRANSFER_IN: "Transferência (Entrada)",
  TRANSFER_OUT: "Transferência (Saída)",
  BIRTH: "Nascimento",
  CULL: "Descarte",
};

/* =======================
   UI Components
======================= */

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-lv-border bg-lv-surface p-4 shadow-[0_18px_40px_rgba(31,26,19,0.12)]">
      <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-lv-green/10 blur-2xl" />
      <div className="text-xs text-lv-muted">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-lv-fg">{value}</div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-lv-border bg-lv-surface p-4 shadow-[0_18px_40px_rgba(31,26,19,0.12)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-lv-fg">{title}</div>
        <div className="h-2 w-2 rounded-full bg-lv-green shadow-[0_0_0_6px_rgba(15,90,50,0.10)]" />
      </div>
      {children}
    </div>
  );
}

/* =======================
   Página
======================= */

export default function DashboardPage() {
  const [totalLots, setTotalLots] = useState(0);
  const [speciesCount, setSpeciesCount] = useState(0);
  const [movementsCount, setMovementsCount] = useState(0);

  const [lots, setLots] = useState<Lot[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);

  const [loading, setLoading] = useState(true);

  async function getActiveTenantId(): Promise<string | null> {
    const token = getToken();
    if (!token) return null;

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return null;

    const { data } = await supabase
      .from("user_profiles")
      .select("active_tenant_id")
      .eq("user_id", userId)
      .maybeSingle();

    return data?.active_tenant_id ?? null;
  }

  useEffect(() => {
    (async () => {
      setLoading(true);

      const tenantId = await getActiveTenantId();
      if (!tenantId) {
        setLoading(false);
        return;
      }

      /* Total de lotes */
      const { count: lotCount } = await supabase
        .from("lots")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      setTotalLots(lotCount ?? 0);

      /* Lotes recentes */
      const { data: lotsData } = await supabase
        .from("lots")
        .select("id,code,species,lot_type")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(8);

      const safeLots = (lotsData ?? []) as Lot[];
      setLots(safeLots);

      /* Espécies */
      const speciesSet = new Set(safeLots.map((l) => l.species));
      setSpeciesCount(speciesSet.size);

      /* Movimentações */
      const { data: movData } = await supabase
        .from("movements")
        .select("id,movement_type,movement_date,qty")
        .eq("tenant_id", tenantId)
        .order("movement_date", { ascending: false })
        .limit(6);

      const safeMov = (movData ?? []) as Movement[];
      setMovements(safeMov);
      setMovementsCount(safeMov.length);

      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-lg font-semibold text-lv-fg">Dashboard</h1>
        <p className="text-sm text-lv-muted">
          Visão geral da sua operação
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total de Lotes" value={loading ? "—" : totalLots} />
        <StatCard title="Espécies" value={loading ? "—" : speciesCount} />
        <StatCard
          title="Últimas Movimentações"
          value={loading ? "—" : movementsCount}
        />
      </div>

      {/* Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lotes */}
        <Panel title="Lotes recentes">
          {loading ? (
            <div className="text-sm text-lv-muted">Carregando...</div>
          ) : lots.length === 0 ? (
            <div className="text-sm text-lv-muted">Nenhum lote encontrado.</div>
          ) : (
            <div className="space-y-2">
              {lots.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-xl bg-white/70 ring-1 ring-lv-border px-3 py-2 hover:bg-white transition"
                >
                  <div>
                    <div className="text-sm font-medium text-lv-fg">
                      {l.code} — {l.lot_type}
                    </div>
                    <div className="text-xs text-lv-muted">
                      {speciesLabels[l.species] ?? l.species}
                    </div>
                  </div>
                  <span className="text-lv-muted">—</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Movimentações */}
        <Panel title="Movimentações recentes">
          {loading ? (
            <div className="text-sm text-lv-muted">Carregando...</div>
          ) : movements.length === 0 ? (
            <div className="text-sm text-lv-muted">
              Nenhuma movimentação encontrada.
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl bg-white/70 ring-1 ring-lv-border px-3 py-2 hover:bg-white transition"
                >
                  <div>
                    <div className="text-sm font-medium text-lv-fg">
                      {movementLabels[m.movement_type] ?? m.movement_type}
                    </div>
                    <div className="text-xs text-lv-muted">
                      {new Date(m.movement_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-lv-fg">
                    {m.qty ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
