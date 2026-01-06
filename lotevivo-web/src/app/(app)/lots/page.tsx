"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

/* =========================
   TYPES
========================= */
type Lot = {
  id: string;
  code: string;
  species: string;
  lot_type?: string;
  breed?: string;
};

/* =========================
   UI COMPONENTS
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

/* =========================
   PAGE
========================= */
export default function LotsPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLots() {
    setLoading(true);
    setError(null);

    try {
      // 🔥 backend retorna ARRAY, não { items }
      const res = await apiGet<Lot[]>("/lots?limit=200");
      setLots(res ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar lotes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLots();
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lotes"
        subtitle="Gerencie os lotes do seu criatório."
        actions={
          <>
            <Link
              href="/lots/new"
              className="rounded-xl bg-lv-green px-4 py-2 text-sm font-medium text-white shadow-[0_10px_20px_rgba(15,82,50,0.18)] hover:bg-lv-green/90 transition"
            >
              Novo lote
            </Link>
          </>
        }
      />

      <Card>
        <div className="p-4 md:p-5 border-b border-lv-border flex items-center justify-between">
          <div className="text-sm font-semibold text-lv-fg">Lotes cadastrados</div>
          <div className="text-sm text-lv-muted">
            {loading ? "Carregando..." : `${lots.length} itens`}
          </div>
        </div>

        <div className="p-4 md:p-5">
          {error ? (
            <div className="rounded-2xl border border-lv-border bg-white/60 p-6">
              <div className="text-sm font-semibold text-lv-fg">Falha ao carregar</div>
              <p className="mt-1 text-sm text-lv-muted">{error}</p>

              <div className="mt-4">
                <button
                  onClick={loadLots}
                  className="rounded-xl bg-lv-green px-4 py-2 text-sm font-medium text-white hover:bg-lv-green/90 transition"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : !loading && lots.length === 0 ? (
            <div className="rounded-2xl border border-lv-border bg-white/60 p-6">
              <div className="text-sm font-semibold text-lv-fg">
                Nenhum lote cadastrado
              </div>
              <p className="mt-1 text-sm text-lv-muted">
                Cadastre um lote para organizar seus animais.
              </p>

              <div className="mt-4 flex gap-2">
                <Link
                  href="/lots/new"
                  className="rounded-xl bg-lv-green px-4 py-2 text-sm font-medium text-white hover:bg-lv-green/90 transition"
                >
                  Cadastrar lote
                </Link>

                <Link
                  href="/dashboard"
                  className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
                >
                  Voltar ao dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-lv-border rounded-2xl border border-lv-border bg-white/60 overflow-hidden">
              {lots.map((lot) => (
                <div
                  key={lot.id}
                  className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-lv-fg">
                      {lot.code}
                    </div>
                    <div className="text-xs text-lv-muted">
                      Espécie: {lot.species}
                      {lot.lot_type && ` • Tipo: ${lot.lot_type}`}
                      {lot.breed && ` • Raça: ${lot.breed}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/lots/${lot.id}`}
                      className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
                    >
                      Ver detalhes
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
