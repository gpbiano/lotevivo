"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getActiveTenant,
  listMyTenants,
  setActiveTenant,
  type ActiveTenant,
} from "@/lib/tenant";

export default function TenantSwitcher() {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ActiveTenant | null>(null);
  const [tenants, setTenants] = useState<ActiveTenant[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [a, t] = await Promise.all([getActiveTenant(), listMyTenants()]);
      setActive(a);
      setTenants(t);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar empresas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onChange(id: string) {
    try {
      await setActiveTenant(id || null);
      await refresh();
      // força as páginas a refletirem a empresa ativa
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || "Erro ao definir empresa ativa.");
    }
  }

  const label = useMemo(() => {
    if (loading) return "Carregando...";
    if (!active?.name) return "Selecione uma empresa";
    return `Empresa ativa: ${active.name}`;
  }, [loading, active?.name]);

  return (
    <div className="flex items-center gap-2">
      {/* Badge (desktop) */}
      <div className="hidden md:inline-flex items-center gap-2 rounded-full border border-lv-border bg-white/70 px-3 py-1.5 text-xs text-lv-fg shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
        <span className="h-1.5 w-1.5 rounded-full bg-lv-green shadow-[0_0_0_6px_rgba(15,82,50,0.12)]" />
        <span className="text-lv-muted">Empresa ativa</span>
        <span className="font-semibold text-lv-fg truncate max-w-[180px]">
          {active?.name ?? "—"}
        </span>
      </div>

      {/* Select */}
      <div className="relative">
        <select
          disabled={loading || tenants.length === 0}
          value={active?.id || ""}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={[
            "h-10 max-w-[260px] appearance-none rounded-2xl px-3 pr-9 text-sm",
            "border border-lv-border bg-white/70 text-lv-fg",
            "shadow-[0_12px_24px_rgba(0,0,0,0.06)]",
            "outline-none transition",
            "focus:ring-4 focus:ring-lv-green/20 focus:border-lv-green/40",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          <option value="" disabled>
            {loading ? "Carregando..." : "Selecione uma empresa"}
          </option>

          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {/* setinha */}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lv-muted"
        >
          <path
            fill="currentColor"
            d="M5.3 7.7a1 1 0 0 1 1.4 0L10 11l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z"
          />
        </svg>
      </div>

      {error && (
        <div className="hidden md:block text-xs text-red-700/80">
          {error}
        </div>
      )}
    </div>
  );
}
