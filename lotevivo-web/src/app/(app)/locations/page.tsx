"use client";

import Link from "next/link";

function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-lg font-semibold text-lv-fg">{title}</h1>
        {subtitle && <p className="text-sm text-lv-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-lv-border bg-lv-surface/85 backdrop-blur shadow-soft">
      {children}
    </div>
  );
}

export default function LocationsPage() {
  const locations: any[] = [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Locais"
        subtitle="Cadastre galpões, piquetes, pastos e demais locais do seu criatório."
        actions={
          <button
            className="rounded-xl bg-lv-green px-4 py-2 text-sm font-medium text-white shadow-[0_10px_20px_rgba(15,82,50,0.18)] hover:bg-lv-green/90 transition"
            onClick={() => alert("Em breve: criar local")}
          >
            Novo local
          </button>
        }
      />

      <Card>
        <div className="p-4 md:p-5 border-b border-lv-border flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-semibold text-lv-fg">Lista de locais</div>

          <input
            placeholder="Buscar (em breve)"
            className="w-full md:w-72 rounded-xl border border-lv-border bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-lv-green/20"
            disabled
          />
        </div>

        <div className="p-4 md:p-5">
          {locations.length === 0 ? (
            <div className="rounded-2xl border border-lv-border bg-white/60 p-6">
              <div className="text-sm font-semibold text-lv-fg">
                Nenhum local cadastrado
              </div>
              <p className="mt-1 text-sm text-lv-muted">
                Crie locais para organizar lotes e registrar movimentações.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="rounded-xl bg-lv-green px-4 py-2 text-sm font-medium text-white hover:bg-lv-green/90 transition"
                  onClick={() => alert("Em breve: criar local")}
                >
                  Criar local
                </button>

                <Link
                  href="/dashboard"
                  className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
                >
                  Voltar ao dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-lv-border rounded-2xl border border-lv-border bg-white/60 overflow-hidden">
              <div className="p-4 text-sm text-lv-muted">
                Renderizar lista aqui…
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
