"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

type Supplier = {
  id: string;
  tenant_id: string;
  name: string | null;
  legal_name: string | null;
  trade_name: string | null;
  document: string | null;
  type: string | null;
  notes: string | null;
  created_at: string;
};

type SupplierRow = Supplier & {
  cityUF?: string;
  contactsCount?: number;
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] bg-lv-green/12 ring-1 ring-lv-green/25 text-lv-fg">
      {children}
    </span>
  );
}

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-lv-border bg-lv-surface shadow-[0_18px_40px_rgba(31,26,19,0.12)]">
      <div className="flex items-start justify-between gap-3 p-5 border-b border-lv-border">
        <div>
          <h1 className="text-base font-semibold text-lv-fg">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-lv-muted">{subtitle}</p>}
        </div>
        {right}
      </div>

      <div className="p-5">{children}</div>
    </div>
  );
}

export default function SuppliersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function getActiveCompanyId(): Promise<string | null> {
    const token = getToken();
    if (!token) return null;

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return null;

    const { data } = await supabase
      .from("user_profiles")
      .select("active_tenant_id")
      .eq("user_id", userId)
      .maybeSingle();

    return data?.active_tenant_id ?? null;
  }

  async function enrichSuppliers(companyId: string, suppliers: Supplier[]) {
    if (suppliers.length === 0) return [];

    const ids = suppliers.map((s) => s.id);

    // Endereço “principal”: vamos pegar o mais recente por supplier (created_at desc)
    const { data: addrData } = await supabase
      .from("supplier_addresses")
      .select("supplier_id, city, state, created_at")
      .eq("tenant_id", companyId)
      .in("supplier_id", ids)
      .order("created_at", { ascending: false });

    const cityUFBySupplier = new Map<string, string>();
    (addrData ?? []).forEach((a: any) => {
      if (!cityUFBySupplier.has(a.supplier_id)) {
        const city = (a.city ?? "").trim();
        const st = (a.state ?? "").trim();
        const label = [city, st].filter(Boolean).join("/") || "—";
        cityUFBySupplier.set(a.supplier_id, label);
      }
    });

    // Contatos: contar por supplier
    const { data: contactData } = await supabase
      .from("supplier_contacts")
      .select("supplier_id")
      .eq("tenant_id", companyId)
      .in("supplier_id", ids);

    const countBySupplier = new Map<string, number>();
    (contactData ?? []).forEach((c: any) => {
      countBySupplier.set(c.supplier_id, (countBySupplier.get(c.supplier_id) ?? 0) + 1);
    });

    return suppliers.map((s) => ({
      ...s,
      cityUF: cityUFBySupplier.get(s.id) ?? "—",
      contactsCount: countBySupplier.get(s.id) ?? 0,
    })) as SupplierRow[];
  }

  async function loadSuppliers() {
    setLoading(true);
    setError(null);

    try {
      const companyId = await getActiveCompanyId();
      if (!companyId) {
        setRows([]);
        return;
      }

      const baseQuery = supabase
        .from("suppliers")
        .select(`
          id,
          tenant_id,
          name,
          legal_name,
          trade_name,
          document,
          type,
          notes,
          created_at
        `)
        .eq("tenant_id", companyId)
        .order("created_at", { ascending: false });

      const q = query.trim();

      const res = q
        ? await baseQuery.or(
            `
            name.ilike.%${q}%,
            legal_name.ilike.%${q}%,
            trade_name.ilike.%${q}%,
            document.ilike.%${q}%,
            notes.ilike.%${q}%
          `
          )
        : await baseQuery;

      if (res.error) throw res.error;

      const suppliers = (res.data ?? []) as Supplier[];
      const enriched = await enrichSuppliers(companyId, suppliers);
      setRows(enriched);
    } catch {
      setError("Não foi possível carregar os fornecedores.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function createSupplier() {
    setCreating(true);
    setError(null);

    try {
      const companyId = await getActiveCompanyId();
      if (!companyId) {
        setError("Nenhuma empresa ativa selecionada.");
        return;
      }

      const { data, error: e } = await supabase
        .from("suppliers")
        .insert({
          tenant_id: companyId,
          name: "Novo fornecedor",
          legal_name: null,
          trade_name: null,
          document: null,
          type: null,
          notes: null,
        })
        .select("id")
        .single();

      if (e || !data?.id) throw e;

      router.push(`/suppliers/${data.id}`);
    } catch {
      setError("Não foi possível criar um novo fornecedor.");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
    // eslint-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadSuppliers(), 300);
    return () => clearTimeout(t);
    // eslint-next-line react-hooks/exhaustive-deps
  }, [query]);

  const empty = !loading && rows.length === 0;

  return (
    <div className="space-y-5">
      <Card
        title="Fornecedores"
        subtitle="Cadastre e gerencie fornecedores, endereços e contatos."
        right={
          <button
            onClick={createSupplier}
            disabled={loading || creating}
            className={[
              "rounded-xl px-4 py-2 text-sm bg-lv-green/12 ring-1 ring-lv-green/25 text-lv-fg transition",
              loading || creating
                ? "opacity-60 cursor-not-allowed"
                : "hover:bg-lv-green/18 hover:ring-lv-green/35",
            ].join(" ")}
          >
            {creating ? "Criando..." : "Novo fornecedor"}
          </button>
        }
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, documento ou notas..."
            className="w-full md:w-[420px] px-3 py-2 rounded-xl bg-white/70 ring-1 ring-lv-border focus:outline-none focus:ring-lv-green/30 text-sm text-lv-fg placeholder:text-lv-muted"
          />
          <Badge>{loading ? "Carregando..." : `${rows.length} resultado(s)`}</Badge>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-900/80">
            {error}
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 rounded-xl bg-white/60 ring-1 ring-lv-border animate-pulse"
                />
              ))}
            </div>
          ) : empty ? (
            <div className="rounded-2xl border border-lv-border bg-white/60 p-5">
              <div className="text-sm font-medium text-lv-fg">Nenhum fornecedor cadastrado</div>
              <div className="mt-1 text-sm text-lv-muted">
                Quando você cadastrar fornecedores, eles aparecerão aqui.
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-lv-border bg-white/60">
              <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[11px] uppercase tracking-wider text-lv-muted border-b border-lv-border">
                <div className="col-span-4">Fornecedor</div>
                <div className="col-span-2">Documento</div>
                <div className="col-span-2">Cidade/UF</div>
                <div className="col-span-1">Contatos</div>
                <div className="col-span-2">Tipo</div>
                <div className="col-span-1 text-right">Ações</div>
              </div>

              <div className="divide-y divide-lv-border">
                {rows.map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-white/80 transition"
                  >
                    <div className="col-span-4 min-w-0">
                      <div className="text-sm font-medium text-lv-fg truncate">
                        {s.name || s.trade_name || s.legal_name || "—"}
                      </div>
                      {s.legal_name && (
                        <div className="text-xs text-lv-muted truncate">{s.legal_name}</div>
                      )}
                    </div>

                    <div className="col-span-2 text-sm text-lv-fg/90">{s.document || "—"}</div>
                    <div className="col-span-2 text-sm text-lv-fg/90">{s.cityUF || "—"}</div>

                    <div className="col-span-1 text-sm text-lv-fg/90">
                      {s.contactsCount ?? 0}
                    </div>

                    <div className="col-span-2 text-sm text-lv-fg/90">{s.type || "—"}</div>

                    <div className="col-span-1 text-right">
                      <Link
                        href={`/suppliers/${s.id}`}
                        className="text-sm text-lv-green hover:underline"
                      >
                        Abrir
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
