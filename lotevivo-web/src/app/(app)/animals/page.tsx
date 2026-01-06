"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

/* ================= TYPES ================= */

type Animal = {
  id: string;
  tag_id?: string | null;
  name?: string | null;
  species: string;
  sex: string;
  status: string;
  current_lot_id?: string | null;
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

export default function AnimalsPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await apiGet<any>("/animals?limit=200");

      // 🔒 garante array sempre
      if (Array.isArray(res.items)) {
        setAnimals(res.items);
      } else {
        setAnimals([]);
      }
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar animais");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* ================= RENDER ================= */

  return (
    <div className="space-y-5">
      <PageHeader
        title="Animais"
        subtitle="Controle individual dos animais e evolução de peso (GMD)."
        actions={
          <>
            <Link
              href="/weighings/batch"
              className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm hover:bg-white transition"
            >
              Pesagem em lote
            </Link>

            <Link
              href="/animals/new"
              className="rounded-xl bg-lv-green px-4 py-2 text-sm font-medium text-white hover:bg-lv-green/90 transition"
            >
              Novo animal
            </Link>
          </>
        }
      />

      <Card>
        <div className="p-4 md:p-5 border-b border-lv-border flex justify-between">
          <div className="text-sm font-semibold text-lv-fg">Lista de animais</div>
          <div className="text-sm text-lv-muted">
            {loading ? "Carregando..." : `${animals.length} itens`}
          </div>
        </div>

        <div className="p-4 md:p-5">
          {error ? (
            <div className="rounded-2xl border border-lv-border bg-white/60 p-6">
              <div className="text-sm font-semibold">Falha ao carregar</div>
              <p className="text-sm text-lv-muted mt-1">{error}</p>
            </div>
          ) : !loading && animals.length === 0 ? (
            <div className="rounded-2xl border border-lv-border bg-white/60 p-6">
              <div className="text-sm font-semibold">
                Nenhum animal cadastrado
              </div>
              <p className="text-sm text-lv-muted mt-1">
                Cadastre animais para registrar pesagens e calcular o GMD.
              </p>

              <div className="mt-4 flex gap-2">
                <Link
                  href="/animals/new"
                  className="rounded-xl bg-lv-green px-4 py-2 text-sm text-white"
                >
                  Cadastrar animal
                </Link>

                <Link
                  href="/lots"
                  className="rounded-xl border border-lv-border px-4 py-2 text-sm"
                >
                  Ver lotes
                </Link>
              </div>
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
                      Espécie: {a.species} • Sexo: {a.sex} • Status: {a.status}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/animals/${a.id}`}
                      className="rounded-xl border border-lv-border px-3 py-1.5 text-sm hover:bg-white"
                    >
                      Ver animal
                    </Link>

                    <Link
                      href={`/animals/${a.id}/weighings`}
                      className="rounded-xl bg-lv-green px-3 py-1.5 text-sm text-white"
                    >
                      Pesagens
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
