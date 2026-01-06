// src/app/(app)/admin/tenants/[id]/users/page.tsx
import Link from "next/link";
import TenantUsers from "@/components/admin/tenants/TenantUsers";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TenantUsersPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-lv-fg">Usuários da empresa</h1>
          <p className="text-sm text-lv-muted">Gerencie usuários vinculados ao tenant.</p>
        </div>

        <Link
          href={`/admin/tenants/${id}`}
          className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
        >
          Voltar
        </Link>
      </div>

      <TenantUsers tenantId={id} />
    </div>
  );
}
