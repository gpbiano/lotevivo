"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/app-shell/Sidebar";
import Header from "@/components/app-shell/Header";
import { getToken } from "@/lib/auth";
import MixpanelProvider from "@/components/providers/MixpanelProvider";

function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base verde (igual login) */}
      <div className="absolute inset-0 bg-emerald-50/70" />

      {/* waves: contain + bottom (igual login) */}
      <div
        className="absolute inset-0 opacity-95"
        style={{
          backgroundImage: 'url("/bg-waves.png")',
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          backgroundPosition: "bottom center",
        }}
      />

      {/* clareia só a parte de cima (não apaga as ondas) */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white/70 to-transparent" />

      {/* vinheta leve no topo */}
      <div className="absolute inset-x-0 top-0 h-[55%] bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.25),rgba(255,255,255,0.85)_70%)]" />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      if (pathname !== "/login") router.replace("/login");
      return;
    }
    setReady(true);
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lv-fg">
        <AppBackground />

        <div className="flex items-center gap-3 rounded-2xl border border-lv-border bg-lv-surface/75 px-5 py-3 shadow-soft backdrop-blur">
          <div className="h-2.5 w-2.5 rounded-full bg-lv-green shadow-[0_0_0_6px_rgba(15,82,50,0.12)]" />
          <div className="text-sm text-lv-fg/90">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-lv-fg">
      <AppBackground />

      {/* ✅ Mixpanel roda no client quando app renderiza */}
      <MixpanelProvider />

      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex-1 min-w-0 flex flex-col">
          <Header />

          <main className="flex-1 min-w-0 p-4 md:p-6 overflow-x-auto overflow-y-auto">
            <div className="max-w-[1400px] mx-auto min-w-0">
              <div className="rounded-3xl border border-lv-border bg-lv-surface/80 backdrop-blur p-4 md:p-6 shadow-soft min-w-0 overflow-x-auto">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
