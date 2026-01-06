"use client";

import Link from "next/link";

type TenantStatus = "active" | "inactive";
type PersonType = "PJ" | "PF";

type TenantListItem = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  created_at: string;

  tenant_profiles: null | {
    person_type: PersonType;
    document: string;
    trade_name: string | null;
  };

  tenant_addresses: Array<{
    address_type: "FISCAL" | "PRODUCTION";
    city: string | null;
    state: string | null;
  }>;
};

export default function TenantTable({
  items,
  loading,
}: {
  items: TenantListItem[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
        Carregando...
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
        Nenhuma empresa encontrada.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-white/10">
      <table className="min-w-[1050px] w-full text-sm">
        <thead className="bg-white/5 text-zinc-300">
          <tr>
            <th className="text-left font-medium p-3">Empresa</th>
            <th className="text-left font-medium p-3">Slug</th>
            <th className="text-left font-medium p-3">PJ/PF</th>
            <th className="text-left font-medium p-3">Documento</th>
            <th className="text-left font-medium p-3">Cidade/UF (Fiscal)</th>
            <th className="text-left font-medium p-3">Status</th>
            <th className="text-left font-medium p-3">Criado em</th>
            <th className="text-right font-medium p-3">Ações</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-white/10">
          {items.map((t) => {
            const fiscal = t.tenant_addresses?.find((a) => a.address_type === "FISCAL");
            const cityUf =
              fiscal?.city && fiscal?.state ? `${fiscal.city}/${fiscal.state}` : fiscal?.city || fiscal?.state || "—";

            return (
              <tr key={t.id} className="hover:bg-white/5">
                <td className="p-3 text-zinc-100">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-zinc-400">
                    {t.tenant_profiles?.trade_name ? t.tenant_profiles.trade_name : "—"}
                  </div>
                </td>

                <td className="p-3 text-zinc-300">{t.slug}</td>
                <td className="p-3 text-zinc-300">{t.tenant_profiles?.person_type || "—"}</td>
                <td className="p-3 text-zinc-300">{t.tenant_profiles?.document || "—"}</td>
                <td className="p-3 text-zinc-300">{cityUf}</td>

                <td className="p-3">
                  <span
                    className={[
                      "inline-flex items-center px-2 py-1 rounded-md text-xs ring-1",
                      t.status === "active"
                        ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25"
                        : "bg-amber-500/15 text-amber-200 ring-amber-500/25",
                    ].join(" ")}
                  >
                    {t.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </td>

                <td className="p-3 text-zinc-300">
                  {new Date(t.created_at).toLocaleDateString()}
                </td>

                <td className="p-3 text-right">
                  <Link
                    href={`/admin/tenants/${t.id}`}
                    className="px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
