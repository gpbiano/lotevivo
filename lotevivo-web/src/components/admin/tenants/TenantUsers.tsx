"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPatch } from "@/lib/api";

type UserRole = "ADMIN" | "OPERATOR" | "CONSULTANT";

type TenantUserItem = {
  user_id: string;
  email: string | null;
  role: UserRole;
  created_at: string;
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-lv-border bg-lv-surface/85 backdrop-blur shadow-soft">
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-lv-fg">{label}</label>
        {hint && <span className="text-[11px] text-lv-muted">{hint}</span>}
      </div>
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
        props.disabled ? "opacity-70 cursor-not-allowed" : "",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "w-full rounded-xl border border-lv-border bg-white/70 px-3 py-2 text-sm outline-none",
        "focus:ring-2 focus:ring-lv-green/20",
        props.disabled ? "opacity-70 cursor-not-allowed" : "",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Badge({ role }: { role: UserRole }) {
  const cfg =
    role === "ADMIN"
      ? "bg-lv-green/12 text-lv-green ring-lv-green/25"
      : role === "OPERATOR"
        ? "bg-black/5 text-lv-fg/80 ring-lv-border"
        : "bg-white/60 text-lv-fg/80 ring-lv-border";

  const label = role === "ADMIN" ? "Admin" : role === "OPERATOR" ? "Operador" : "Consultor";

  return (
    <span className={["inline-flex items-center rounded-full px-2.5 py-1 text-[12px] ring-1", cfg].join(" ")}>
      {label}
    </span>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function truncateMiddle(value: string, left = 8, right = 6) {
  const s = String(value || "");
  if (s.length <= left + right + 3) return s;
  return `${s.slice(0, left)}…${s.slice(-right)}`;
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  loading,
  tone = "danger",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? loading
        ? "bg-red-500/30 cursor-not-allowed"
        : "bg-red-600 hover:bg-red-600/90"
      : loading
        ? "bg-lv-green/40 cursor-not-allowed"
        : "bg-lv-green hover:bg-lv-green/90 shadow-[0_10px_20px_rgba(15,82,50,0.18)]";

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
            className={["rounded-xl px-4 py-2 text-sm font-medium text-white transition", confirmClass].join(" ")}
          >
            {loading ? "Processando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TenantUsers({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TenantUserItem[]>([]);

  // form
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("OPERATOR");

  // ui states
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [query, setQuery] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // confirm remove
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TenantUserItem | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = (await apiGet(`/admin/tenants/${tenantId}/users`)) as { items: TenantUserItem[] };
      setItems(res?.items ?? []);
    } catch (e: any) {
      setItems([]);
      setError(e?.message ?? "Falha ao carregar usuários do tenant.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const value = email.trim().toLowerCase();
    if (!value || !value.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }

    setAdding(true);
    try {
      await apiPost(`/admin/tenants/${tenantId}/users`, { email: value, role });
      setEmail("");
      setRole("OPERATOR");
      setSuccess("Usuário vinculado com sucesso!");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível vincular usuário.");
    } finally {
      setAdding(false);
    }
  }

  async function onChangeRole(userId: string, newRole: UserRole) {
    setError(null);
    setSuccess(null);
    setBusyId(userId);

    try {
      await apiPatch(`/admin/tenants/${tenantId}/users/${userId}`, { role: newRole });
      setSuccess("Permissão atualizada.");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Falha ao atualizar role.");
    } finally {
      setBusyId(null);
    }
  }

  function openRemove(u: TenantUserItem) {
    setRemoveTarget(u);
    setConfirmOpen(true);
  }

  async function onConfirmRemove() {
    if (!removeTarget) return;

    setError(null);
    setSuccess(null);
    setBusyId(removeTarget.user_id);

    try {
      // api.ts não tem DELETE, então fazemos fetch direto com API_BASE + Bearer
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("lv_token") || localStorage.getItem("token")
          : null;

      const base =
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:3333";

      const res = await fetch(`${base}/admin/tenants/${tenantId}/users/${removeTarget.user_id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        const body = ct.includes("application/json")
          ? await res.json().catch(() => null)
          : await res.text().catch(() => null);

        const msg =
          (body && typeof body === "object" && "message" in body && (body as any).message) ||
          (typeof body === "string" && body) ||
          res.statusText ||
          "Falha ao remover vínculo.";

        throw new Error(msg);
      }

      setSuccess("Usuário removido.");
      setConfirmOpen(false);
      setRemoveTarget(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Falha ao remover vínculo.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((u) => {
      const email = String(u.email ?? "").toLowerCase();
      const id = String(u.user_id ?? "").toLowerCase();
      const role = String(u.role ?? "").toLowerCase();
      return email.includes(q) || id.includes(q) || role.includes(q);
    });
  }, [items, query]);

  return (
    <div className="space-y-5">
      {(error || success) && (
        <div
          className={[
            "rounded-2xl border p-4",
            error ? "border-red-500/20 bg-red-500/10" : "border-lv-border bg-white/60",
          ].join(" ")}
        >
          <div className="text-sm font-semibold text-lv-fg">{error ? "Falha" : "Tudo certo"}</div>
          <p className="mt-1 text-sm text-lv-muted">{error ?? success}</p>
        </div>
      )}

      {/* Vincular usuário */}
      <Card>
        <div className="p-4 md:p-5 border-b border-lv-border flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-lv-fg">Vincular usuário</div>
            <p className="mt-1 text-sm text-lv-muted">
              Informe o e-mail do usuário (Auth) e selecione a permissão.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading || adding || !!busyId}
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Atualizar
          </button>
        </div>

        <div className="p-4 md:p-5">
          <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="E-mail do usuário" hint="Precisa existir no Auth">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@dominio.com"
                disabled={loading || adding || !!busyId}
                inputMode="email"
              />
            </Field>

            <Field label="Permissão (role)" hint="Defina o nível de acesso">
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={loading || adding || !!busyId}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="OPERATOR">OPERATOR</option>
                <option value="CONSULTANT">CONSULTANT</option>
              </Select>
            </Field>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading || adding || !!busyId}
                className={[
                  "w-full rounded-xl px-4 py-2 text-sm font-medium text-white transition",
                  loading || adding || !!busyId
                    ? "bg-lv-green/40 cursor-not-allowed"
                    : "bg-lv-green hover:bg-lv-green/90 shadow-[0_10px_20px_rgba(15,82,50,0.18)]",
                ].join(" ")}
              >
                {adding ? "Vinculando..." : "Vincular"}
              </button>
            </div>
          </form>

          <div className="mt-3 text-[11px] text-lv-muted">
            Dica: se o e-mail não existir no Auth, crie o usuário primeiro (cadastro/convite) e depois vincule aqui.
          </div>
        </div>
      </Card>

      {/* Lista */}
      <Card>
        <div className="p-4 md:p-5 border-b border-lv-border flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-lv-fg">Usuários do tenant</div>
            <p className="mt-1 text-sm text-lv-muted">Gerencie permissões e remova vínculos quando necessário.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-lv-muted">{loading ? "Carregando..." : `${filtered.length} usuário(s)`}</div>
          </div>
        </div>

        <div className="p-4 md:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por email, role ou ID..."
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  load();
                }}
                disabled={loading || adding || !!busyId}
                className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Recarregar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-lv-border bg-white/60 p-6 text-sm text-lv-muted">
              Carregando usuários...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-lv-border bg-white/60 p-6">
              <div className="text-sm font-semibold text-lv-fg">Nenhum usuário vinculado</div>
              <p className="mt-1 text-sm text-lv-muted">Use o formulário acima para vincular o primeiro usuário.</p>
            </div>
          ) : (
            <div className="overflow-auto rounded-2xl border border-lv-border bg-white/60">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-white/70 text-lv-muted">
                  <tr className="border-b border-lv-border">
                    <th className="text-left font-medium p-3">Usuário</th>
                    <th className="text-left font-medium p-3">Permissão</th>
                    <th className="text-left font-medium p-3">Vinculado em</th>
                    <th className="text-right font-medium p-3">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-lv-border">
                  {filtered.map((u) => {
                    const busy = busyId === u.user_id;
                    return (
                      <tr key={u.user_id} className="hover:bg-white/70 transition">
                        <td className="p-3">
                          <div className="font-medium text-lv-fg">{u.email ?? "—"}</div>
                          <div className="text-xs text-lv-muted">{truncateMiddle(u.user_id)}</div>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Badge role={u.role} />
                            <Select
                              value={u.role}
                              onChange={(e) => onChangeRole(u.user_id, e.target.value as UserRole)}
                              disabled={busy || loading}
                              className="max-w-[220px]"
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="OPERATOR">OPERATOR</option>
                              <option value="CONSULTANT">CONSULTANT</option>
                            </Select>
                          </div>

                          {busy ? <div className="mt-1 text-[11px] text-lv-muted">Salvando...</div> : null}
                        </td>

                        <td className="p-3 text-lv-fg/80">{formatDate(u.created_at)}</td>

                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => openRemove(u)}
                            disabled={busy || loading}
                            className={[
                              "rounded-xl px-3 py-2 text-sm transition ring-1",
                              busy
                                ? "bg-red-500/10 ring-red-500/15 text-red-400 cursor-not-allowed opacity-60"
                                : "bg-red-500/10 ring-red-500/20 hover:bg-red-500/15 text-red-600",
                            ].join(" ")}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <ConfirmModal
        open={confirmOpen}
        title="Remover usuário"
        message={
          removeTarget
            ? `Remover o vínculo do usuário "${removeTarget.email ?? removeTarget.user_id}" deste tenant?`
            : "Confirme a ação."
        }
        confirmLabel="Remover"
        tone="danger"
        loading={!!busyId}
        onConfirm={onConfirmRemove}
        onClose={() => {
          if (busyId) return;
          setConfirmOpen(false);
          setRemoveTarget(null);
        }}
      />
    </div>
  );
}
