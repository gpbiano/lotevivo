"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-lv-fg">{label}</label>
        {hint && <span className="text-[11px] text-lv-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-lv-border bg-white/70 px-3 py-2 text-sm outline-none",
        "focus:ring-2 focus:ring-lv-green/20",
        props.disabled ? "opacity-70 cursor-not-allowed" : "",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "w-full rounded-xl border border-lv-border bg-white/70 px-3 py-2 text-sm outline-none",
        "focus:ring-2 focus:ring-lv-green/20",
        props.disabled ? "opacity-70 cursor-not-allowed" : "",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "w-full rounded-xl border border-lv-border bg-white/70 px-3 py-2 text-sm outline-none",
        "focus:ring-2 focus:ring-lv-green/20",
        props.disabled ? "opacity-70 cursor-not-allowed" : "",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

export default function NovoClientePage() {
  const router = useRouter();

  const [tipo, setTipo] = useState<"PF" | "PJ" | "OUTRO">("PJ");
  const [nome, setNome] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [documento, setDocumento] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const podeSalvar = useMemo(() => nome.trim().length >= 2 && !salvando, [nome, salvando]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!podeSalvar) {
      setErro("Informe o nome do cliente.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        type: tipo === "OUTRO" ? "OUTRO" : tipo,
        name: nome.trim(),
        trade_name: nomeFantasia.trim() || null,
        document: documento.trim() || null,
        state_registration: inscricaoEstadual.trim() || null,
        email: email.trim() || null,
        phone: telefone.trim() || null,
        notes: observacoes.trim() || null,
        is_active: ativo,
      };

      await apiPost("/customers", payload);

      router.replace("/customers");
      router.refresh();
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao cadastrar cliente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cadastrar cliente"
        subtitle="Cadastre clientes com dados de contato e identificação."
        actions={
          <Link
            href="/customers"
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
          >
            Voltar
          </Link>
        }
      />

      <form onSubmit={onSubmit} className="space-y-5">
        <Card>
          <div className="p-4 md:p-5 border-b border-lv-border">
            <div className="text-sm font-semibold text-lv-fg">Dados do cliente</div>
            <p className="mt-1 text-sm text-lv-muted">O nome é obrigatório. Os demais campos são opcionais.</p>
          </div>

          <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tipo de cliente" hint="Pessoa Física ou Jurídica">
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as any)} disabled={salvando}>
                <option value="PJ">Pessoa Jurídica (PJ)</option>
                <option value="PF">Pessoa Física (PF)</option>
                <option value="OUTRO">Outro</option>
              </Select>
            </Field>

            <Field label="Status" hint="Ativo/Inativo">
              <Select value={ativo ? "ativo" : "inativo"} onChange={(e) => setAtivo(e.target.value === "ativo")} disabled={salvando}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </Select>
            </Field>

            <Field label="Nome" hint="Obrigatório">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} disabled={salvando} />
            </Field>

            <Field label="Nome fantasia" hint="Opcional">
              <Input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} disabled={salvando} />
            </Field>

            <Field label="Documento" hint="CPF/CNPJ (opcional)">
              <Input value={documento} onChange={(e) => setDocumento(e.target.value)} disabled={salvando} />
            </Field>

            <Field label="Inscrição estadual" hint="Opcional">
              <Input value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} disabled={salvando} />
            </Field>

            <Field label="E-mail" hint="Opcional">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={salvando} />
            </Field>

            <Field label="Telefone" hint="Opcional">
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} disabled={salvando} />
            </Field>

            <div className="md:col-span-2">
              <Field label="Observações" hint="Opcional">
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={4} disabled={salvando} />
              </Field>
            </div>

            {erro && (
              <div className="md:col-span-2 rounded-2xl border border-lv-border bg-white/60 p-4">
                <div className="text-sm font-semibold text-lv-fg">Falha ao salvar</div>
                <p className="mt-1 text-sm text-lv-muted">{erro}</p>
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={!podeSalvar}
            className={[
              "rounded-xl px-4 py-2 text-sm font-medium text-white transition",
              podeSalvar
                ? "bg-lv-green hover:bg-lv-green/90 shadow-[0_10px_20px_rgba(15,82,50,0.18)]"
                : "bg-lv-green/40 cursor-not-allowed",
            ].join(" ")}
          >
            {salvando ? "Salvando..." : "Cadastrar cliente"}
          </button>

          <Link
            href="/customers"
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
