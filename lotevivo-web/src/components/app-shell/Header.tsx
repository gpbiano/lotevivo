"use client";

import { useEffect, useMemo, useState } from "react";
import TenantSwitcher from "@/components/app-shell/TenantSwitcher";
import { supabase } from "@/lib/supabase";
import { getToken } from "@/lib/auth";

export default function Header() {
  const [query, setQuery] = useState("");
  const [displayName, setDisplayName] = useState<string>("");

  // Carrega "responsible_name" do tenant ativo (tenant_profiles)
  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) return;

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return;

      const fallback =
        (user.email?.split("@")[0] || "Bem-vindo").replace(/\./g, " ");
      let name = fallback;

      const { data: up } = await supabase
        .from("user_profiles")
        .select("active_tenant_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const activeTenantId = up?.active_tenant_id ?? null;

      if (activeTenantId) {
        const { data: tp } = await supabase
          .from("tenant_profiles")
          .select("responsible_name")
          .eq("tenant_id", activeTenantId)
          .maybeSingle();

        if (tp?.responsible_name?.trim()) {
          name = tp.responsible_name.trim();
        }
      }

      setDisplayName(name);
    })();
  }, []);

  const greeting = useMemo(() => {
    if (!displayName) return "Olá 👋";
    return `Olá, ${displayName} 👋`;
  }, [displayName]);

  return (
    <header className="sticky top-0 z-30">
      {/* vidro principal */}
      <div className="relative border-b border-lv-border bg-lv-surface/75 backdrop-blur-xl">
        {/* brilho suave (top glow) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(900px_140px_at_20%_0%,rgba(15,82,50,0.14),transparent)]" />

        {/* linha de luz dourada sutil */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(182,139,45,0.35)] to-transparent" />

        <div className="relative flex items-center gap-4 px-4 py-4 md:px-6">
          {/* Saudação */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-lv-fg leading-tight">
              {greeting}
            </div>
            <div className="mt-0.5 text-xs text-lv-muted">
              Visão geral do seu criatório e operações
            </div>
          </div>

          {/* Busca */}
          <div className="hidden lg:block w-[360px]">
            <div className="flex items-center gap-2 rounded-2xl border border-lv-border bg-white/75 px-3 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.08)] backdrop-blur">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 text-lv-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar (em breve)"
                className="w-full bg-transparent outline-none text-sm text-lv-fg placeholder:text-lv-muted"
              />
            </div>
          </div>

          {/* Tenant switcher */}
          <div className="min-w-[220px]">
            <TenantSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
