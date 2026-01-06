"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

type PageProps = {
  params: Promise<{ id: string }>;
};

type Tenant = {
  id: string;
  name: string;
  trade_name: string | null;
  document: string | null;
  is_active: boolean;
  created_at: string;
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-lv-border bg-lv-surface/85 backdrop-blur shadow-soft">
      {children}
    </div>
  );
}

export default function AdminTenantDetailPage(props: PageProps) {
  const [tenantId, setTenantId] = useState<string>("");
  const [item, setItem] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await props.params;
      setTenantId(p.id);
    })();
  }, [props.params]);

  useEffect(() => {
    if (!tenantId) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // por enquanto: reaproveita list e filtra
        const res = (await apiGet("/admin/tenants?limit=500")) as { items: Tenant[] };
        const found = (res.items ?? []).find((t) => t.id === tenantId) ?? null;
        setItem(found);
        if (!found) setError("Empresa não encontrada.");
      } catch (e: any) {
        setError(e?.message ?? "Erro ao carregar empresa.");
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  const title = useMemo(() => item?.trade_name || item?.name || "Empresa", [item]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-lv-fg">{title}</h1>
          <p className="text-sm text-lv-muted">Detalhes da empresa (tenant) e atalhos de administração.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/tenants"
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
          >
            Voltar
          </Link>

          {tenantId ? (
            <Link
              href={`/admin/tenants/${tenantId}/users`}
              className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
            >
              Usuários
            </Link>
          ) : null}

          <Link
            href="/admin/tenants/new"
            className="rounded-xl bg-lv-green px-4 py-2 text-sm font-medium text-white hover:bg-lv-green/90 transition"
          >
            Nova empresa
          </Link>
        </div>
      </div>

      <Card>
        <div className="p-4 md:p-5 border-b border-lv-border">
          <div className="text-sm font-semibold text-lv-fg">Informações</div>
          <p className="mt-1 text-sm text-lv-muted">Dados gerais do tenant (carregado da listagem).</p>
        </div>

        <div className="p-4 md:p-5">
          {loading ? (
            <div className="text-sm text-lv-muted">Carregando...</div>
          ) : error ? (
            <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
              <div className="text-sm font-semibold text-lv-fg">Falha</div>
              <p className="mt-1 text-sm text-lv-muted">{error}</p>
            </div>
          ) : item ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
                <div className="text-xs text-lv-muted">Nome</div>
                <div className="mt-1 text-sm font-semibold text-lv-fg">{item.name || "—"}</div>
              </div>

              <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
                <div className="text-xs text-lv-muted">Nome fantasia</div>
                <div className="mt-1 text-sm font-semibold text-lv-fg">{item.trade_name || "—"}</div>
              </div>

              <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
                <div className="text-xs text-lv-muted">Documento</div>
                <div className="mt-1 text-sm font-semibold text-lv-fg">{item.document || "—"}</div>
              </div>

              <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
                <div className="text-xs text-lv-muted">Status</div>
                <div className="mt-1 text-sm font-semibold text-lv-fg">{item.is_active ? "Ativa" : "Inativa"}</div>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
