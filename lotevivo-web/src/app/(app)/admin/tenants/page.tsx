"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch } from "@/lib/api";

type MeResponse = {
  userId: string;
  email: string | null;
  role: string;
  activeTenantId: string;
};

type Tenant = {
  id: string;
  name: string;
  trade_name: string | null;
  document: string | null;
  is_active: boolean;
  created_at: string;
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

function Badge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] ring-1",
        active ? "bg-lv-green/12 text-lv-green ring-lv-green/25" : "bg-black/5 text-lv-muted ring-lv-border",
      ].join(" ")}
    >
      <span className={["h-2 w-2 rounded-full", active ? "bg-lv-green" : "bg-black/20"].join(" ")} />
      {active ? "Ativa" : "Inativa"}
    </span>
  );
}

function Switch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "h-7 w-12 rounded-full ring-1 relative transition",
        checked ? "bg-lv-green/90 ring-lv-green/30" : "bg-black/10 ring-lv-border",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:opacity-95",
      ].join(" ")}
      aria-label={checked ? "Desativar empresa" : "Ativar empresa"}
    >
      <span
        className={[
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition",
          checked ? "left-5" : "left-0.5",
        ].join(" ")}
      />
    </button>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-lv-border bg-white/90 shadow-soft overflow-hidden">
        <div className="p-4 md:p-5 border-b border-lv-border">
          <div className="text-sm font-semibold text-lv-fg">{title}</div>
          <p className="mt-1 text-sm text-lv-muted">{message}</p>
        </div>

        <div className="p-4 md:p-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={!!loading}
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!!loading}
            className={[
              "rounded-xl px-4 py-2 text-sm font-medium text-white transition",
              loading
                ? "bg-lv-green/40 cursor-not-allowed"
                : "bg-lv-green hover:bg-lv-green/90 shadow-[0_10px_20px_rgba(15,82,50,0.18)]",
            ].join(" ")}
          >
            {loading ? "Salvando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDoc(doc: string | null) {
  if (!doc) return "—";
  const digits = String(doc).replace(/\D/g, "");

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(
      12
    )}`;
  }
  return doc;
}

export default function AdminTenantsPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [nextStatus, setNextStatus] = useState<boolean>(true);

  const isSuperAdmin = useMemo(() => me?.role === "super_admin", [me?.role]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const meRes = (await apiGet("/me")) as MeResponse;
      setMe(meRes);

      if (meRes.role !== "super_admin") {
        setTenants([]);
        setError("Acesso restrito ao administrador do sistema.");
        return;
      }

      const res = (await apiGet("/admin/tenants?limit=200")) as { items: Tenant[] };
      setTenants(res.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar empresas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openConfirm(t: Tenant, desired: boolean) {
    setSelected(t);
    setNextStatus(desired);
    setConfirmOpen(true);
  }

  async function onConfirmToggle() {
    if (!selected) return;

    setToggling(true);
    setError(null);

    try {
      await apiPatch(`/admin/tenants/${selected.id}/status`, { is_active: nextStatus });

      setTenants((prev) => prev.map((x) => (x.id === selected.id ? { ...x, is_active: nextStatus } : x)));

      setConfirmOpen(false);
      setSelected(null);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao atualizar status da empresa.");
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Empresas"
        subtitle="Gerencie todas as empresas cadastradas na plataforma (somente super admin)."
        actions={
          isSuperAdmin ? (
            <Link
              href="/admin/tenants/new"
              className="rounded-xl bg-lv-green px-4 py-2 text-sm font-medium text-white hover:bg-lv-green/90 transition"
            >
              Nova empresa
            </Link>
          ) : null
        }
      />

      {error ? (
        <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
          <div className="text-sm font-semibold text-lv-fg">Atenção</div>
          <p className="mt-1 text-sm text-lv-muted">{error}</p>
        </div>
      ) : null}

      <Card>
        <div className="p-4 md:p-5 border-b border-lv-border flex items-center justify-between">
          <div className="text-sm font-semibold text-lv-fg">Lista de empresas</div>
          <div className="text-sm text-lv-muted">{loading ? "Carregando..." : `${tenants.length} itens`}</div>
        </div>

        <div className="p-4 md:p-5">
          {!isSuperAdmin && !loading ? (
            <div className="rounded-2xl border border-lv-border bg-white/60 p-6">
              <div className="text-sm font-semibold text-lv-fg">Acesso restrito</div>
              <p className="mt-1 text-sm text-lv-muted">Esta área é exclusiva do super administrador do sistema.</p>
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-lv-border bg-white/60 p-6 text-sm text-lv-muted">
              Carregando empresas...
            </div>
          ) : tenants.length === 0 ? (
            <div className="rounded-2xl border border-lv-border bg-white/60 p-6">
              <div className="text-sm font-semibold text-lv-fg">Nenhuma empresa cadastrada</div>
              <p className="mt-1 text-sm text-lv-muted">Cadastre uma empresa para começar a usar a plataforma.</p>
            </div>
          ) : (
            <div className="divide-y divide-lv-border rounded-2xl border border-lv-border bg-white/60 overflow-hidden">
              {tenants.map((t) => (
                <div key={t.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-lv-fg truncate">{t.trade_name || t.name}</div>
                      <Badge active={t.is_active} />
                    </div>

                    <div className="mt-1 text-xs text-lv-muted">
                      Documento: {formatDoc(t.document)} • Criada em:{" "}
                      {t.created_at ? new Date(t.created_at).toLocaleDateString("pt-BR") : "—"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-2xl border border-lv-border bg-white/70 px-3 py-2">
                      <span className="text-xs text-lv-muted">{t.is_active ? "Ativa" : "Inativa"}</span>
                      <Switch checked={t.is_active} disabled={!isSuperAdmin || toggling} onChange={(d) => openConfirm(t, d)} />
                    </div>

                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
                    >
                      Ver detalhes
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={load}
              className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
              disabled={loading || toggling}
            >
              Atualizar lista
            </button>
          </div>
        </div>
      </Card>

      <ConfirmModal
        open={confirmOpen}
        title={nextStatus ? "Ativar empresa" : "Desativar empresa"}
        message={
          selected
            ? `Tem certeza que deseja ${nextStatus ? "ativar" : "desativar"} a empresa "${selected.trade_name || selected.name}"?`
            : "Confirme a ação."
        }
        confirmLabel={nextStatus ? "Ativar" : "Desativar"}
        loading={toggling}
        onConfirm={onConfirmToggle}
        onClose={() => {
          if (toggling) return;
          setConfirmOpen(false);
          setSelected(null);
        }}
      />
    </div>
  );
}
