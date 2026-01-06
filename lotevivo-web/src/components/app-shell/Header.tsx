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

      // fallback: email antes do @
      const fallback =
        (user.email?.split("@")[0] || "Bem-vindo").replace(/\./g, " ");
      let name = fallback;

      // pega tenant ativo do user_profiles
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
    <header className="sticky top-0 z-20 border-b border-lv-border bg-lv-surface/85 backdrop-blur">
      {/* brilho suave premium */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(900px_120px_at_25%_0%,rgba(15,82,50,0.12),transparent)]" />

      <div className="relative flex items-center gap-3 px-4 py-3 md:px-6 md:py-4">
        {/* Título */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-lv-fg">{greeting}</div>
          <div className="text-xs text-lv-muted">
            Visão geral do seu criatório e operações
          </div>
        </div>

        {/* Busca */}
        <div className="hidden md:block w-[340px]">
          <div className="rounded-2xl border border-lv-border bg-white/70 px-3 py-2 shadow-[0_12px_24px_rgba(0,0,0,0.06)]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar (em breve)"
              className="w-full bg-transparent outline-none text-sm text-lv-fg placeholder:text-lv-muted"
            />
          </div>
        </div>

        {/* Seletor de empresa (mantém seu componente) */}
        <div className="min-w-[220px]">
          <TenantSwitcher />
        </div>
      </div>
    </header>
  );
}
