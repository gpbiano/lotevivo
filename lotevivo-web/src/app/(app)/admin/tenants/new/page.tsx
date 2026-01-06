"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

/* =========================
   TIPOS
========================= */
type PersonType = "PF" | "PJ";

type TenantCreatePayload = {
  person_type: PersonType;
  legal_name: string;
  trade_name?: string | null;

  document: string; // CPF/CNPJ (somente números)
  state_registration?: string | null;

  responsible_name?: string | null;
  responsible_document?: string | null;

  email?: string | null;
  phone?: string | null;

  is_active?: boolean;
};

/* =========================
   HELPERS
========================= */
function onlyDigits(s: string) {
  return (s ?? "").replace(/\D/g, "");
}

function formatCpfCnpj(value: string, type: PersonType) {
  const v = onlyDigits(value);

  if (type === "PF") {
    // CPF: 000.000.000-00
    const p1 = v.slice(0, 3);
    const p2 = v.slice(3, 6);
    const p3 = v.slice(6, 9);
    const p4 = v.slice(9, 11);
    const out = [p1, p2, p3].filter(Boolean).join(".");
    return (out + (p4 ? `-${p4}` : "")).slice(0, 14);
  }

  // CNPJ: 00.000.000/0000-00
  const p1 = v.slice(0, 2);
  const p2 = v.slice(2, 5);
  const p3 = v.slice(5, 8);
  const p4 = v.slice(8, 12);
  const p5 = v.slice(12, 14);
  let out = [p1, p2, p3].filter(Boolean).join(".");
  if (p4) out += `/${p4}`;
  if (p5) out += `-${p5}`;
  return out.slice(0, 18);
}

function ufOptions() {
  return [
    "",
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
  ];
}

/* =========================
   COMPONENTES BASE
========================= */
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

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="text-sm font-semibold text-lv-fg">{title}</div>
      {subtitle ? <p className="mt-1 text-sm text-lv-muted">{subtitle}</p> : null}
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

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full rounded-2xl border border-lv-border bg-white/60 p-3 text-left hover:bg-white/70 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-lv-fg">{label}</div>
          {hint ? <div className="mt-0.5 text-xs text-lv-muted">{hint}</div> : null}
        </div>
        <div
          className={[
            "h-6 w-11 rounded-full ring-1 transition relative",
            checked ? "bg-lv-green/90 ring-lv-green/30" : "bg-black/10 ring-lv-border",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
              checked ? "left-5" : "left-0.5",
            ].join(" ")}
          />
        </div>
      </div>
    </button>
  );
}

/* =========================
   PÁGINA
========================= */
export default function AdminTenantNewPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [personType, setPersonType] = useState<PersonType>("PJ");

  // Documentos e identificação
  const [document, setDocument] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");

  // IE para PJ sempre; para PF somente se produtor rural (toggle)
  const [hasStateRegistrationPF, setHasStateRegistrationPF] = useState(false);
  const [stateRegistration, setStateRegistration] = useState("");

  // Responsável
  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleDocument, setResponsibleDocument] = useState("");

  // Contato
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Endereço “base” do cadastro inicial (estado)
  const [uf, setUf] = useState("");

  // Ativo
  const [isActive, setIsActive] = useState(true);

  // Ajustes quando alterna PF/PJ
  useEffect(() => {
    setError(null);
    setSuccess(null);

    // Se virar PF, IE só se toggle
    if (personType === "PF") {
      if (!hasStateRegistrationPF) setStateRegistration("");
    } else {
      setHasStateRegistrationPF(false); // PJ não precisa toggle
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personType]);

  const documentLabel = personType === "PF" ? "CPF" : "CNPJ";
  const docHint = personType === "PF" ? "Apenas números (11 dígitos)" : "Apenas números (14 dígitos)";

  const canEditStateRegistration =
    personType === "PJ" || (personType === "PF" && hasStateRegistrationPF);

  const formattedDoc = useMemo(() => formatCpfCnpj(document, personType), [document, personType]);

  const isValid = useMemo(() => {
    const docDigits = onlyDigits(document);
    const docOk = personType === "PF" ? docDigits.length === 11 : docDigits.length === 14;

    // PF: nome completo obrigatório
    // PJ: razão social obrigatória
    const nameOk = legalName.trim().length >= 2;

    // UF opcional no backend, mas vamos pedir no cadastro inicial (boa prática)
    const ufOk = uf.trim().length === 2;

    return docOk && nameOk && ufOk;
  }, [document, personType, legalName, uf]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isValid) {
      setError("Revise os campos obrigatórios (tipo, documento, nome e UF).");
      return;
    }

    setSaving(true);
    try {
      const payload: TenantCreatePayload & { state?: string | null } = {
        person_type: personType,
        document: onlyDigits(document),
        legal_name: legalName.trim(),
        trade_name: tradeName.trim() || null,
        state_registration: canEditStateRegistration ? stateRegistration.trim() || null : null,
        responsible_name: responsibleName.trim() || null,
        responsible_document: onlyDigits(responsibleDocument) || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        is_active: !!isActive,

        // ✅ Se seu backend suportar salvar UF no tenant (ou profile),
        // você pode receber este campo. Se não suportar, ignore no back.
        state: uf || null,
      };

      const res: any = await apiPost("/admin/tenants", payload);

      setSuccess("Empresa criada com sucesso.");

      // tenta navegar para detalhe se o backend devolver item.id
      const id = res?.item?.id ?? res?.id ?? null;
      if (id) {
        router.push(`/admin/tenants/${id}`);
      } else {
        router.push("/admin/tenants");
      }
    } catch (e: any) {
      setError(e?.message ?? "Erro ao criar empresa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nova empresa"
        subtitle="Crie uma empresa (tenant) para iniciar o uso da plataforma."
        actions={
          <Link
            href="/admin/tenants"
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
          >
            Voltar
          </Link>
        }
      />

      <form onSubmit={onSubmit} className="space-y-5">
        <Card>
          <div className="p-4 md:p-5 border-b border-lv-border">
            <SectionTitle
              title="Identificação"
              subtitle="Aqui o CPF/CNPJ fica aberto porque é o registro inicial."
            />
          </div>

          <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tipo de pessoa" hint="Obrigatório">
              <Select value={personType} onChange={(e) => setPersonType(e.target.value as PersonType)} disabled={saving}>
                <option value="PJ">Pessoa jurídica (PJ)</option>
                <option value="PF">Pessoa física (PF)</option>
              </Select>
            </Field>

            <Field label={documentLabel} hint={docHint}>
              <Input
                value={formattedDoc}
                onChange={(e) => setDocument(e.target.value)}
                disabled={saving}
                inputMode="numeric"
                placeholder={personType === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
              />
            </Field>

            <Field label={personType === "PF" ? "Nome completo" : "Razão social"} hint="Obrigatório">
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                disabled={saving}
                placeholder={personType === "PF" ? "Ex: João da Silva" : "Ex: Criatório Peres LTDA"}
              />
            </Field>

            <Field label="Nome fantasia (opcional)">
              <Input
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                disabled={saving}
                placeholder="Ex: Criatório Peres"
              />
            </Field>

            <Field label="UF (estado)" hint="Obrigatório">
              <Select value={uf} onChange={(e) => setUf(e.target.value)} disabled={saving}>
                {ufOptions().map((x) => (
                  <option key={x || "empty"} value={x}>
                    {x ? x : "Selecione"}
                  </option>
                ))}
              </Select>
            </Field>

            {/* PF produtor rural */}
            {personType === "PF" ? (
              <div className="md:col-span-2">
                <Toggle
                  checked={hasStateRegistrationPF}
                  onChange={(v) => {
                    setHasStateRegistrationPF(v);
                    if (!v) setStateRegistration("");
                  }}
                  label="Produtor rural com inscrição estadual?"
                  hint="Se marcado, você poderá informar a inscrição estadual."
                />
              </div>
            ) : null}

            <Field
              label="Inscrição estadual"
              hint={
                personType === "PF"
                  ? "Disponível apenas se você marcar como produtor rural"
                  : "Opcional"
              }
            >
              <Input
                value={stateRegistration}
                onChange={(e) => setStateRegistration(e.target.value)}
                disabled={saving || !canEditStateRegistration}
                placeholder={canEditStateRegistration ? "Informe a inscrição estadual" : "—"}
              />
            </Field>

            <div className="md:col-span-2">
              <Toggle
                checked={isActive}
                onChange={setIsActive}
                label="Empresa ativa"
                hint="Se desativar, o acesso pode ser bloqueado para usuários desta empresa."
              />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 md:p-5 border-b border-lv-border">
            <SectionTitle
              title="Contato"
              subtitle="Dados para comunicação e suporte (opcionais, mas recomendados)."
            />
          </div>

          <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="E-mail">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
                placeholder="ex: contato@seudominio.com"
              />
            </Field>

            <Field label="Telefone / WhatsApp">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving}
                placeholder="ex: (64) 9xxxx-xxxx"
              />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="p-4 md:p-5 border-b border-lv-border">
            <SectionTitle
              title="Responsável"
              subtitle="Recomendado para PJ (opcional para PF)."
            />
          </div>

          <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome do responsável">
              <Input
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                disabled={saving}
                placeholder="Ex: Genivaldo Peres"
              />
            </Field>

            <Field label="Documento do responsável (CPF)" hint="Opcional">
              <Input
                value={responsibleDocument}
                onChange={(e) => setResponsibleDocument(e.target.value)}
                disabled={saving}
                placeholder="Ex: 000.000.000-00"
              />
            </Field>
          </div>
        </Card>

        {error ? (
          <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
            <div className="text-sm font-semibold text-lv-fg">Falha</div>
            <p className="mt-1 text-sm text-lv-muted">{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
            <div className="text-sm font-semibold text-lv-fg">Tudo certo</div>
            <p className="mt-1 text-sm text-lv-muted">{success}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={saving || !isValid}
            className={[
              "rounded-xl px-4 py-2 text-sm font-medium text-white transition",
              !saving && isValid
                ? "bg-lv-green hover:bg-lv-green/90 shadow-[0_10px_20px_rgba(15,82,50,0.18)]"
                : "bg-lv-green/40 cursor-not-allowed",
            ].join(" ")}
          >
            {saving ? "Salvando..." : "Criar empresa"}
          </button>

          <Link
            href="/admin/tenants"
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
          >
            Cancelar
          </Link>

          <div className="text-xs text-lv-muted">
            Obrigatórios: tipo, {documentLabel}, {personType === "PF" ? "nome completo" : "razão social"} e UF.
          </div>
        </div>
      </form>
    </div>
  );
}
