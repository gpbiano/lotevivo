"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";

/* ================= TYPES ================= */

type Lot = {
  id: string;
  code: string;
  species: string;
  lot_type?: string | null;
  breed?: string | null;
};

type Animal = {
  id: string;
  tag_id?: string | null;
  name?: string | null;
  status: string;
};

/* ================= UI ================= */

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

/* ================= PAGE ================= */

export default function LotDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const [lot, setLot] = useState<Lot | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await apiGet<any>(`/lots/${id}`);

      setLot(res);

      // 🔒 PROTEÇÃO ABSOLUTA
      if (Array.isArray(res.animals)) {
        setAnimals(res.animals);
      } else if (Array.isArray(res.animals?.items)) {
        setAnimals(res.animals.items);
      } else {
        setAnimals([]);
      }
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar lote");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  /* ================= RENDER ================= */

  if (loading) {
    return <div className="text-sm text-lv-muted">Carregando lote...</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-lv-border bg-white/60 p-6">
        <div className="text-sm font-semibold text-lv-fg">Falha ao carregar</div>
        <p className="mt-1 text-sm text-lv-muted">{error}</p>
      </div>
    );
  }

  if (!lot) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Lote ${lot.code}`}
        subtitle={`Espécie: ${lot.species}`}
        actions={
          <Link
            href="/lots"
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm"
          >
            Voltar
          </Link>
        }
      />

      {/* ===== DADOS DO LOTE ===== */}
      <Card>
        <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-lv-muted">Código</div>
            <div className="font-medium">{lot.code}</div>
          </div>

          <div>
            <div className="text-lv-muted">Tipo</div>
            <div className="font-medium">{lot.lot_type ?? "—"}</div>
          </div>

          <div>
            <div className="text-lv-muted">Raça</div>
            <div className="font-medium">{lot.breed ?? "—"}</div>
          </div>
        </div>
      </Card>

      {/* ===== ANIMAIS ===== */}
      <Card>
        <div className="p-4 md:p-5 border-b border-lv-border flex justify-between">
          <div className="text-sm font-semibold text-lv-fg">Animais no lote</div>
          <div className="text-sm text-lv-muted">{animals.length} itens</div>
        </div>

        <div className="p-4 md:p-5">
          {animals.length === 0 ? (
            <div className="text-sm text-lv-muted">
              Nenhum animal vinculado a este lote.
            </div>
          ) : (
            <div className="divide-y divide-lv-border rounded-2xl border border-lv-border bg-white/60 overflow-hidden">
              {animals.map((a) => (
                <div
                  key={a.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {a.tag_id || a.name || "Sem identificação"}
                    </div>
                    <div className="text-xs text-lv-muted">
                      Status: {a.status}
                    </div>
                  </div>

                  <Link
                    href={`/animals/${a.id}`}
                    className="text-sm rounded-xl border border-lv-border px-3 py-1.5 hover:bg-white"
                  >
                    Ver animal
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
