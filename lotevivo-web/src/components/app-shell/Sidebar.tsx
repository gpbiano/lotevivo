"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearToken } from "@/lib/auth";
import { apiGet } from "@/lib/api";

/* =========================
   TIPOS
========================= */
type MeResponse = {
  userId: string;
  email: string | null;
  role: string;
  activeTenantId: string;
};

/* =========================
   ÍCONES SVG INLINE
========================= */
function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={[
        "h-4 w-4 text-lv-muted transition-transform duration-200",
        open ? "rotate-180" : "rotate-0",
      ].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 13h8V3H3zM13 21h8v-8h-8zM13 3h8v6h-8zM3 21h8v-4H3z" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function IconBoxes() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

function IconMap() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
      <path d="M9 3v15M15 6v15" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="17.5" cy="17.5" r="1.5" />
    </svg>
  );
}

function IconArrows() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 1l4 4-4 4" />
      <path d="M21 5H9" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M3 19h12" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </svg>
  );
}

function IconCow() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
      <path d="M5 10h14v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-6z" />
      <path d="M8 5l-2-2M16 5l2-2" />
      <path d="M9 14h.01M15 14h.01" />
      <path d="M9 19v2M15 19v2" />
    </svg>
  );
}

function IconScale() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v3" />
      <path d="M6 6h12" />
      <path d="M7 6l-3 6h6l-3-6z" />
      <path d="M17 6l-3 6h6l-3-6z" />
      <path d="M8 21h8" />
      <path d="M10 21V12h4v9" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 11a4 4 0 1 0-8 0" />
      <path d="M3 21a7 7 0 0 1 18 0" />
      <path d="M19.5 8.5a2.5 2.5 0 1 1-4.2-1.8" />
      <path d="M1.8 15.6a4.5 4.5 0 0 1 5.4-2.6" />
    </svg>
  );
}

function IconEgg() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2c3.5 0 7 5.2 7 10.2A7 7 0 0 1 5 12.2C5 7.2 8.5 2 12 2z" />
    </svg>
  );
}

function IconIncubator() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9z" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M9 14c1.2-2.2 4.8-2.2 6 0" />
    </svg>
  );
}

/* ✅ NOVO: ÍCONE KANBAN */
function IconKanban() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      <path d="M7 8v10" />
      <path d="M12 8v10" />
      <path d="M17 8v10" />
      <path d="M5 10h4" />
      <path d="M10 12h4" />
      <path d="M15 9h4" />
    </svg>
  );
}

/* =========================
   NAV ITEM
========================= */
type NavItemProps = {
  href: string;
  label: string;
  disabled?: boolean;
  icon: React.ReactNode;
  compact?: boolean;
  timeline?: boolean;
};

function NavItem({ href, label, disabled, icon, compact, timeline }: NavItemProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  const base = [
    "group flex items-center gap-3 rounded-2xl text-sm transition ring-1",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-lv-green/30",
    compact ? "px-3 py-2" : "px-3 py-2.5",
    timeline ? "relative" : "",
  ].join(" ");

  const state = disabled
    ? "opacity-50 cursor-not-allowed text-lv-muted ring-transparent"
    : active
      ? "bg-lv-green/12 text-lv-green ring-lv-green/25 shadow-[0_10px_22px_rgba(15,82,50,0.10)]"
      : "text-lv-fg/85 ring-transparent hover:bg-black/5 hover:ring-lv-border";

  const dot = timeline ? (
    <span
      className={[
        "pointer-events-none absolute -left-[9px] top-1/2 -translate-y-1/2",
        "h-[9px] w-[9px] rounded-full border transition",
        active
          ? "bg-lv-green border-lv-green shadow-[0_0_0_6px_rgba(15,82,50,0.12)]"
          : "bg-white/80 border-lv-border group-hover:border-lv-green/60 group-hover:bg-lv-green/20",
      ].join(" ")}
    />
  ) : null;

  const content = (
    <>
      {dot}
      <span
        className={[
          "grid place-items-center h-9 w-9 rounded-xl ring-1 transition",
          active ? "bg-white/80 ring-lv-green/20" : "bg-white/70 ring-lv-border",
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {disabled && <span className="ml-auto text-[11px] text-lv-muted">em breve</span>}
    </>
  );

  if (disabled) return <div className={[base, state].join(" ")}>{content}</div>;

  return (
    <Link href={href} className={[base, state].join(" ")}>
      {content}
    </Link>
  );
}

function DividerLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 mt-5 mb-2 text-[11px] font-medium tracking-wider uppercase text-lv-muted">
      {children}
    </div>
  );
}

/* =========================
   NAV GROUP (COLAPSÁVEL)
========================= */
function NavGroup({
  title,
  icon,
  defaultOpen = false,
  activeMatcher,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  activeMatcher: (pathname: string) => boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const shouldBeOpen = activeMatcher(pathname);
  const [open, setOpen] = useState<boolean>(defaultOpen || shouldBeOpen);

  useEffect(() => {
    if (shouldBeOpen) setOpen(true);
  }, [shouldBeOpen]);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-sm transition ring-1",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-lv-green/30",
          shouldBeOpen
            ? "bg-white/70 ring-lv-border text-lv-fg shadow-[0_10px_24px_rgba(0,0,0,0.06)]"
            : "bg-transparent ring-transparent text-lv-fg/85 hover:bg-black/5 hover:ring-lv-border",
        ].join(" ")}
      >
        <span className="grid place-items-center h-9 w-9 rounded-xl bg-white/70 ring-1 ring-lv-border">
          {icon}
        </span>
        <span className="truncate font-medium">{title}</span>
        <span className="ml-auto">
          <IconChevron open={open} />
        </span>
      </button>

      {open ? (
        <div className="relative mt-1 ml-2 pl-4 flex flex-col gap-1">
          <div className="pointer-events-none absolute left-[6px] top-1 bottom-1 w-px bg-gradient-to-b from-[rgba(14,168,107,0.55)] via-[rgba(182,139,45,0.22)] to-transparent" />
          <div className="pointer-events-none absolute left-[6px] top-1 bottom-1 w-[12px] bg-[radial-gradient(circle_at_left,rgba(14,168,107,0.14),transparent_65%)]" />
          {children}
        </div>
      ) : null}
    </div>
  );
}

/* =========================
   SIDEBAR
========================= */
export default function Sidebar() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const isSuperAdmin = useMemo(() => me?.role === "super_admin", [me?.role]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = (await apiGet("/me")) as MeResponse;
        if (mounted) setMe(res);
      } catch {
        if (mounted) setMe(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  function onLogout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <aside className="hidden md:flex md:w-72 md:flex-col min-h-screen">
      <div className="relative flex h-full flex-col border-r border-lv-border bg-lv-surface/65 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(500px_140px_at_25%_0%,rgba(15,82,50,0.14),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(182,139,45,0.35)] to-transparent" />

        {/* Brand (sticky) */}
        <div className="sticky top-0 z-10 p-4 border-b border-lv-border bg-lv-surface/70 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-2xl bg-white/85 ring-1 ring-lv-border flex items-center justify-center overflow-hidden shadow-sm">
              <Image src="/logo.png" alt="LoteVivo" width={44} height={44} />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,168,107,0.18),transparent_55%)]" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-lv-fg truncate">LoteVivo</div>
              <div className="text-xs text-lv-muted truncate">Sistema de Gestão Pecuária</div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-lv-border bg-white/70 p-3 shadow-[0_10px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-lv-muted">Status</span>
              <span className="h-2 w-2 rounded-full bg-lv-green shadow-[0_0_0_6px_rgba(15,82,50,0.12)]" />
            </div>
            <div className="text-xs text-lv-fg/80 mt-1">Conectado</div>
          </div>
        </div>

        {/* Menu (scrollável) */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto [scrollbar-gutter:stable]">
          <DividerLabel>Geral</DividerLabel>
          <NavItem href="/dashboard" label="Dashboard" icon={<IconDashboard />} />

          <DividerLabel>Operação</DividerLabel>
          <NavGroup
            title="Operações"
            icon={<IconArrows />}
            defaultOpen={true}
            activeMatcher={(p) =>
              p.startsWith("/lots") ||
              p.startsWith("/animals") ||
              p.startsWith("/weighings") ||
              p.startsWith("/movements")
            }
          >
            <NavItem href="/lots" label="Lotes" icon={<IconBoxes />} compact timeline />
            <NavItem href="/animals" label="Animais" icon={<IconCow />} compact timeline />
            <NavItem href="/weighings/batch" label="Pesagem em lote" icon={<IconScale />} compact timeline />
            <NavItem href="/movements" label="Movimentações" icon={<IconArrows />} compact timeline disabled />
          </NavGroup>

          <DividerLabel>Produção</DividerLabel>
          <NavGroup
            title="Produção (Aves)"
            icon={<IconEgg />}
            defaultOpen={true}
            activeMatcher={(p) =>
              p.startsWith("/production/kanban") ||
              p.startsWith("/egg-production") ||
              p.startsWith("/incubation-cycles") ||
              p.startsWith("/incubations")
            }
          >
            {/* ✅ NOVO: Kanban de estágios */}
            <NavItem
              href="/production/kanban"
              label="Kanban (Estágios)"
              icon={<IconKanban />}
              compact
              timeline
            />

            <NavItem href="/egg-production" label="Produção de ovos" icon={<IconEgg />} compact timeline disabled />
            <NavItem href="/incubation-cycles" label="Ciclos de incubação" icon={<IconIncubator />} compact timeline disabled />
            <NavItem href="/incubations" label="Incubação (geral)" icon={<IconIncubator />} compact timeline disabled />
          </NavGroup>

          <DividerLabel>Cadastros</DividerLabel>
          <NavGroup
            title="Cadastros"
            icon={<IconUser />}
            defaultOpen={true}
            activeMatcher={(p) =>
              p.startsWith("/tenant") ||
              p.startsWith("/locations") ||
              p.startsWith("/customers") ||
              p.startsWith("/suppliers")
            }
          >
            <NavItem href="/tenant" label="Perfil do Produtor" icon={<IconUser />} compact timeline />
            <NavItem href="/locations" label="Locais" icon={<IconMap />} compact timeline />
            <NavItem href="/customers" label="Clientes" icon={<IconUsers />} compact timeline />
            <NavItem href="/suppliers" label="Fornecedores" icon={<IconTruck />} compact timeline />
          </NavGroup>

          {isSuperAdmin ? (
            <>
              <DividerLabel>Admin</DividerLabel>
              <NavGroup
                title="Administração"
                icon={<IconBuilding />}
                defaultOpen={false}
                activeMatcher={(p) => p.startsWith("/admin")}
              >
                <NavItem href="/admin/tenants" label="Empresas" icon={<IconBuilding />} compact timeline />
              </NavGroup>
            </>
          ) : null}
        </nav>

        {/* Footer (fixo) */}
        <div className="p-3 border-t border-lv-border bg-lv-surface/70 backdrop-blur-xl">
          <button
            onClick={onLogout}
            className="w-full px-3 py-2 rounded-xl text-sm bg-lv-green text-white hover:bg-lv-green/90 transition shadow-[0_14px_30px_rgba(15,82,50,0.18)]"
          >
            Sair
          </button>

          <div className="mt-3 text-[11px] text-lv-muted">
            © {new Date().getFullYear()} LoteVivo • GP Labs
          </div>
        </div>
      </div>
    </aside>
  );
}
