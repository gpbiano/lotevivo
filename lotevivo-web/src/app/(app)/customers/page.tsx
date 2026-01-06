"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

type Cliente = {
  id: string;
  tenant_id: string;
  type: string; // PF | PJ | outro
  name: string;
  trade_name: string | null;
  document: string | null;
  state_registration: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

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

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-lv-border bg-white/70 px-3 py-2 text-sm outline-none",
        "focus:ring-2 focus:ring-lv-green/20",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: "ok" | "muted" }) {
  const cls =
    tone === "ok"
      ? "bg-lv-green/12 text-lv-green ring-lv-green/20"
      : "bg-black/5 text-lv-muted ring-lv-border";
  return (
    <span className={["inline-flex items-center rounded-full px-2.5 py-1 text-[11px] ring-1", cls].join(" ")}>
      {children}
    </span>
  );
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  async function carregar() {
    setCarregando(true);
    setErro(null);

    try {
      const qs = new URLSearchParams();
      qs.set("limit", "200");
      if (busca.trim()) qs.set("search", busca.trim());

      const res = await apiGet<{ items: Cliente[] }>(`/customers?${qs.toString()}`);
      setClientes(res.items ?? []);
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao carregar clientes.");
      setClientes([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalLabel = useMemo(() => {
    if (carregando) return "Carregando...";
    return `${clientes.length} clientes`;
  }, [clientes.length, carregando]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        subtitle="Cadastre e gerencie seus clientes."
        actions={
          <Link
            href="/customers/new"
            className="rounded-xl bg-lv-green px-4 py-2 text-sm font-medium text-white shadow-[0_10px_20px_rgba(15,82,50,0.18)] hover:bg-lv-green/90 transition"
          >
            Novo cliente
          </Link>
        }
      />

      <Card>
        <div className="p-4 md:p-5 border-b border-lv-border flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-lv-fg">Lista de clientes</div>
            <div className="text-sm text-lv-muted">{totalLabel}</div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, documento, e-mail..."
              className="md:w-80"
            />
            <button
              onClick={carregar}
              className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
            >
              Buscar
            </button>
          </div>
        </div>

        <div className="p-4 md:p-5">
          {erro ? (
            <div className="rounded-2xl border border-lv-border bg-white/60 p-6">
              <div className="text-sm font-semibold text-lv-fg">Falha ao carregar</div>
              <p className="mt-1 text-sm text-lv-muted">{erro}</p>
              <div className="mt-4">
                <button
                  onClick={carregar}
                  className="rounded-xl bg-lv-green px-4 py-2 text-sm font-medium text-white hover:bg-lv-green/90 transition"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : !carregando && clientes.length === 0 ? (
            <div className="rounded-2xl border border-lv-border bg-white/60 p-6">
              <div className="text-sm font-semibold text-lv-fg">Nenhum cliente cadastrado</div>
              <p className="mt-1 text-sm text-lv-muted">
                Cadastre clientes para organizar seu relacionamento e registros.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/customers/new"
                  className="rounded-xl bg-lv-green px-4 py-2 text-sm font-medium text-white hover:bg-lv-green/90 transition"
                >
                  Cadastrar cliente
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
              {clientes.map((c) => (
                <div
                  key={c.id}
                  className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-lv-fg truncate">{c.name}</div>
                      {c.trade_name ? <Badge>{c.trade_name}</Badge> : null}
                      <Badge tone={c.is_active ? "ok" : "muted"}>
                        {c.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      {c.type ? <Badge>{c.type.toUpperCase()}</Badge> : null}
                    </div>

                    <div className="mt-1 text-xs text-lv-muted">
                      {c.document ? `Documento: ${c.document} • ` : ""}
                      {c.phone ? `Telefone: ${c.phone} • ` : ""}
                      {c.email ? `E-mail: ${c.email}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/customers/${c.id}/edit`}
                      className="rounded-xl bg-lv-green px-4 py-2 text-sm font-medium text-white hover:bg-lv-green/90 transition"
                    >
                      Editar
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
