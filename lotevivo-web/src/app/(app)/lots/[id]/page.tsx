"use client";

import { useEffect, useMemo, useState } from "react";
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

type AnimalsListResponse = {
  items: Animal[];
  total?: number;
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
  const params = useParams();
  const id = useMemo(() => {
    const raw = (params as any)?.id;
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  }, [params]);

  const [lot, setLot] = useState<Lot | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(lotId: string) {
    if (!lotId) return;

    setLoading(true);
    setError(null);

    try {
      // 1) carrega lote
      const lotRes = (await apiGet(`/lots/${lotId}`)) as Lot;
      setLot(lotRes);

      // 2) carrega animais do lote (fonte da verdade)
      // OBS: teu backend filtra por animals.current_lot_id = lotId
      const animalsRes = (await apiGet(
        `/animals?lotId=${encodeURIComponent(lotId)}&limit=500`
      )) as AnimalsListResponse;

      setAnimals(Array.isArray(animalsRes?.items) ? animalsRes.items : []);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar lote");
      setLot(null);
      setAnimals([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!id) return;
      if (!alive) return;
      await load(id);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ================= RENDER ================= */

  if (!id) {
    return (
      <div className="rounded-2xl border border-lv-border bg-white/60 p-6">
        <div className="text-sm font-semibold text-lv-fg">Lote inválido</div>
        <p className="mt-1 text-sm text-lv-muted">Não foi possível identificar o ID do lote.</p>
      </div>
    );
  }

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
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm hover:bg-white transition"
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
                <div key={a.id} className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {a.tag_id || a.name || "Sem identificação"}
                    </div>
                    <div className="text-xs text-lv-muted">Status: {a.status}</div>
                  </div>

                  <Link
                    href={`/animals/${a.id}`}
                    className="text-sm rounded-xl border border-lv-border px-3 py-1.5 hover:bg-white transition"
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
