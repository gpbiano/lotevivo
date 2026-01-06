"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/app-shell/Sidebar";
import Header from "@/components/app-shell/Header";
import { getToken } from "@/lib/auth";


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
        <div className="fixed inset-0 -z-10 bg-lv-bg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(15,82,50,0.14),transparent_45%),radial-gradient(circle_at_82%_14%,rgba(200,164,76,0.16),transparent_45%),radial-gradient(circle_at_55%_85%,rgba(133,172,35,0.12),transparent_48%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.55),rgba(246,241,231,0.95))]" />
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-lv-border bg-lv-surface/75 px-5 py-3 shadow-soft backdrop-blur">
          <div className="h-2.5 w-2.5 rounded-full bg-lv-green shadow-[0_0_0_6px_rgba(15,82,50,0.12)]" />
          <div className="text-sm text-lv-fg/90">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-lv-fg">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-lv-bg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(15,82,50,0.14),transparent_45%),radial-gradient(circle_at_82%_14%,rgba(200,164,76,0.16),transparent_45%),radial-gradient(circle_at_55%_85%,rgba(133,172,35,0.12),transparent_48%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.55),rgba(246,241,231,0.95))]" />
        <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,rgba(15,82,50,1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,82,50,1)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <Header />

          <main className="p-4 md:p-6">
            <div className="max-w-[1400px] mx-auto">
              <div className="rounded-3xl border border-lv-border bg-lv-surface/80 backdrop-blur p-4 md:p-6 shadow-soft">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
