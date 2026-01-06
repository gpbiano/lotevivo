"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPut } from "@/lib/api";

type PersonType = "PF" | "PJ";

type Address = {
  zip_code: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  complement: string;
};

type TenantProfile = {
  tenant_id: string;
  person_type: PersonType;
  document: string;

  legal_name: string | null;
  trade_name: string | null;
  state_registration: string | null;

  responsible_name: string | null;
  responsible_document: string | null;

  email: string | null;
  phone: string | null;

  marketing_opt_in: boolean | null;

  logo_url?: string | null;
  logo_path?: string | null;
};

type TenantProfileResponse = {
  profile: TenantProfile | null;
  addresses: {
    fiscal: any | null;
    production: any | null;
  };
};

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

function normalizeAddress(row: any | null): Address {
  return {
    zip_code: row?.zip_code ?? "",
    street: row?.street ?? "",
    number: row?.number ?? "",
    district: row?.district ?? "",
    city: row?.city ?? "",
    state: row?.state ?? "",
    complement: row?.complement ?? "",
  };
}

function onlyDigits(s: string) {
  return (s ?? "").replace(/\D/g, "");
}

function formatCpfCnpj(value: string, type: PersonType) {
  const v = onlyDigits(value);
  if (type === "PF") {
    const p1 = v.slice(0, 3);
    const p2 = v.slice(3, 6);
    const p3 = v.slice(6, 9);
    const p4 = v.slice(9, 11);
    const out = [p1, p2, p3].filter(Boolean).join(".");
    return (out + (p4 ? `-${p4}` : "")).slice(0, 14);
  }
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

function formatCep(value: string) {
  const v = onlyDigits(value).slice(0, 8);
  if (v.length <= 5) return v;
  return `${v.slice(0, 5)}-${v.slice(5)}`;
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

async function apiPostForm(path: string, formData: FormData) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("lv_token") || localStorage.getItem("token")
      : null;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3333"}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch (_) {
    // ignore
  }

  if (!res.ok) {
    const msg = json?.message || `Erro ao enviar arquivo (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return json;
}

export default function TenantProfilePage() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dados do banco (travados onde necessário)
  const [personType, setPersonType] = useState<PersonType>("PJ");
  const [document, setDocument] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [stateRegistration, setStateRegistration] = useState("");
  const [hasStateRegistrationPF, setHasStateRegistrationPF] = useState(false);

  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleDocument, setResponsibleDocument] = useState("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [productionSameAsFiscal, setProductionSameAsFiscal] = useState(true);

  const [addressFiscal, setAddressFiscal] = useState<Address>({
    zip_code: "",
    street: "",
    number: "",
    district: "",
    city: "",
    state: "",
    complement: "",
  });

  const [addressProduction, setAddressProduction] = useState<Address>({
    zip_code: "",
    street: "",
    number: "",
    district: "",
    city: "",
    state: "",
    complement: "",
  });

  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const documentLabel = personType === "PF" ? "CPF" : "CNPJ";
  const docHint = personType === "PF" ? "Apenas números (11 dígitos)" : "Apenas números (14 dígitos)";

  const canEditStateRegistration =
    personType === "PJ" || (personType === "PF" && hasStateRegistrationPF);

  const canSubmit = useMemo(() => !(saving || loading), [saving, loading]);

  async function load() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const raw = (await apiGet("/tenant-profile")) as any;

      // ✅ aceita { profile, addresses } OU { item: { profile, addresses } }
      const res: TenantProfileResponse =
        raw?.item?.profile || raw?.item?.addresses ? raw.item : raw;

      const p = res?.profile;
      const fiscal = normalizeAddress(res?.addresses?.fiscal ?? null);
      const production = normalizeAddress(res?.addresses?.production ?? null);

      if (p) {
        setPersonType((p.person_type as PersonType) ?? "PJ");
        setDocument(p.document ?? "");
        setLegalName(p.legal_name ?? "");
        setTradeName(p.trade_name ?? "");
        setStateRegistration(p.state_registration ?? "");

        setResponsibleName(p.responsible_name ?? "");
        setResponsibleDocument(p.responsible_document ?? "");
        setEmail(p.email ?? "");
        setPhone(p.phone ?? "");
        setMarketingOptIn(!!p.marketing_opt_in);

        setLogoUrl((p as any)?.logo_url ?? null);

        if ((p.person_type as PersonType) === "PF" && (p.state_registration ?? "").trim().length > 0) {
          setHasStateRegistrationPF(true);
        } else {
          setHasStateRegistrationPF(false);
        }
      } else {
        setLogoUrl(null);
        setHasStateRegistrationPF(false);
      }

      setAddressFiscal(fiscal);
      setAddressProduction(production);

      const same =
        JSON.stringify(fiscal) === JSON.stringify(production) ||
        (!res?.addresses?.production && !!res?.addresses?.fiscal);
      setProductionSameAsFiscal(same);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar perfil.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    setSaving(true);
    try {
      const payload = {
        // ⚠️ no backend você pode ignorar person_type/document (travados),
        // mas mandamos por compatibilidade com seu schema atual
        person_type: personType,
        document: onlyDigits(document),

        // ⚠️ legal_name é travado para o cliente (vem do cadastro)
        // então mandamos o valor atual, mas o input é disabled
        legal_name: legalName.trim() || null,
        trade_name: tradeName.trim() || null,

        state_registration: canEditStateRegistration ? stateRegistration.trim() || null : null,

        responsible_name: responsibleName.trim() || null,
        responsible_document: onlyDigits(responsibleDocument) || null,

        email: email.trim() || null,
        phone: phone.trim() || null,

        marketing_opt_in: !!marketingOptIn,

        production_same_as_fiscal: !!productionSameAsFiscal,

        address_fiscal: {
          zip_code: formatCep(addressFiscal.zip_code),
          street: addressFiscal.street.trim() || null,
          number: addressFiscal.number.trim() || null,
          district: addressFiscal.district.trim() || null,
          city: addressFiscal.city.trim() || null,
          state: addressFiscal.state || null,
          complement: addressFiscal.complement.trim() || null,
        },

        address_production: productionSameAsFiscal
          ? undefined
          : {
              zip_code: formatCep(addressProduction.zip_code),
              street: addressProduction.street.trim() || null,
              number: addressProduction.number.trim() || null,
              district: addressProduction.district.trim() || null,
              city: addressProduction.city.trim() || null,
              state: addressProduction.state || null,
              complement: addressProduction.complement.trim() || null,
            },
      };

      await apiPut("/tenant-profile", payload);
      setSuccess("Perfil atualizado com sucesso.");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function onPickLogo() {
    fileRef.current?.click();
  }

  async function onUploadLogo(file: File) {
    setError(null);
    setSuccess(null);

    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await apiPostForm("/tenant-profile/logo", fd);

      const nextUrl =
        res?.logo_url ??
        res?.profile?.logo_url ??
        res?.data?.logo_url ??
        res?.item?.logo_url ??
        res?.item?.profile?.logo_url ??
        null;

      if (nextUrl) setLogoUrl(nextUrl);

      setSuccess("Logo atualizado com sucesso.");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao enviar logo.");
    } finally {
      setUploadingLogo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const docValueFormatted = useMemo(() => formatCpfCnpj(document, personType), [document, personType]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Perfil do produtor"
        subtitle="Confira e atualize os dados do seu perfil. Alguns campos são definidos no cadastro e não podem ser editados."
        actions={
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
            disabled={loading}
          >
            Atualizar
          </button>
        }
      />

      <form onSubmit={onSave} className="space-y-5">
        {/* Identificação + Logo */}
        <Card>
          <div className="p-4 md:p-5 border-b border-lv-border flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <SectionTitle
              title="Identificação"
              subtitle="Nome e documento vêm do cadastro e não podem ser alterados aqui."
            />

            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadLogo(f);
                }}
              />

              <button
                type="button"
                onClick={onPickLogo}
                disabled={uploadingLogo || loading}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-medium text-white transition",
                  uploadingLogo || loading
                    ? "bg-lv-green/40 cursor-not-allowed"
                    : "bg-lv-green hover:bg-lv-green/90 shadow-[0_10px_20px_rgba(15,82,50,0.18)]",
                ].join(" ")}
              >
                {uploadingLogo ? "Enviando..." : "Alterar logo"}
              </button>
            </div>
          </div>

          <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tipo de pessoa" hint="Definido no cadastro (travado)">
                <Select value={personType} disabled>
                  <option value="PJ">Pessoa jurídica (PJ)</option>
                  <option value="PF">Pessoa física (PF)</option>
                </Select>
              </Field>

              <Field label={documentLabel} hint={docHint}>
                <Input value={docValueFormatted} disabled />
              </Field>

              <Field label={personType === "PF" ? "Nome completo" : "Razão social"}>
                <Input value={legalName || "—"} disabled />
              </Field>

              <Field label="Nome fantasia (opcional)" hint="Você pode editar">
                <Input
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  disabled={loading || saving}
                  placeholder="Ex: Criatório Peres"
                />
              </Field>

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

              <div className={personType === "PF" ? "md:col-span-2" : ""}>
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
                    disabled={loading || saving || !canEditStateRegistration}
                    placeholder={canEditStateRegistration ? "Informe a inscrição estadual" : "—"}
                  />
                </Field>
              </div>
            </div>

            {/* Preview do logo */}
            <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
              <div className="text-sm font-semibold text-lv-fg">Logo</div>
              <p className="mt-1 text-sm text-lv-muted">Pré-visualização do logo do seu criatório.</p>

              <div className="mt-4 rounded-2xl border border-lv-border bg-white/70 p-4 flex items-center justify-center min-h-[160px]">
                {logoUrl ? (
                  <div className="relative h-24 w-24 overflow-hidden rounded-2xl ring-1 ring-lv-border bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Logo do criatório" className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="text-sm text-lv-muted text-center">
                    Nenhum logo enviado.
                    <div className="text-xs mt-1">Clique em “Alterar logo” para enviar.</div>
                  </div>
                )}
              </div>

              <div className="mt-3 text-[11px] text-lv-muted">
                Formatos aceitos: PNG, JPG, WEBP ou SVG • Tamanho máx. 2MB
              </div>
            </div>
          </div>
        </Card>

        {/* Contato */}
        <Card>
          <div className="p-4 md:p-5 border-b border-lv-border">
            <SectionTitle title="Contato" subtitle="Essas informações podem ser usadas para suporte e comunicação." />
          </div>

          <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="E-mail">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || saving}
                placeholder="ex: contato@seudominio.com"
              />
            </Field>

            <Field label="Telefone / WhatsApp">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading || saving}
                placeholder="ex: (64) 9xxxx-xxxx"
              />
            </Field>

            <div className="md:col-span-2">
              <Toggle checked={marketingOptIn} onChange={setMarketingOptIn} label="Aceito receber comunicações" hint="Você pode mudar isso quando quiser." />
            </div>
          </div>
        </Card>

        {/* Responsável */}
        <Card>
          <div className="p-4 md:p-5 border-b border-lv-border">
            <SectionTitle
              title="Responsável"
              subtitle="Preencha se houver um responsável pela empresa/criatório (recomendado para PJ)."
            />
          </div>

          <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome do responsável">
              <Input
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                disabled={loading || saving}
                placeholder="Ex: João da Silva"
              />
            </Field>

            <Field label="Documento do responsável (CPF)" hint="Opcional">
              <Input
                value={responsibleDocument}
                onChange={(e) => setResponsibleDocument(e.target.value)}
                disabled={loading || saving}
                placeholder="Ex: 000.000.000-00"
              />
            </Field>
          </div>
        </Card>

        {/* Endereços */}
        <Card>
          <div className="p-4 md:p-5 border-b border-lv-border">
            <SectionTitle title="Endereços" subtitle="Informe o endereço fiscal e, se necessário, o endereço da produção." />
          </div>

          <div className="p-4 md:p-5 space-y-5">
            {/* Fiscal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <div className="text-sm font-semibold text-lv-fg">Endereço fiscal</div>
                <p className="mt-1 text-sm text-lv-muted">Usado para notas, cadastros e documentos.</p>
              </div>

              <Field label="CEP">
                <Input
                  value={formatCep(addressFiscal.zip_code)}
                  onChange={(e) => setAddressFiscal((s) => ({ ...s, zip_code: formatCep(e.target.value) }))}
                  disabled={loading || saving}
                  placeholder="00000-000"
                />
              </Field>

              <Field label="Rua">
                <Input
                  value={addressFiscal.street}
                  onChange={(e) => setAddressFiscal((s) => ({ ...s, street: e.target.value }))}
                  disabled={loading || saving}
                  placeholder="Rua / Avenida"
                />
              </Field>

              <Field label="Número">
                <Input
                  value={addressFiscal.number}
                  onChange={(e) => setAddressFiscal((s) => ({ ...s, number: e.target.value }))}
                  disabled={loading || saving}
                  placeholder="Ex: 123"
                />
              </Field>

              <Field label="Bairro (distrito)">
                <Input
                  value={addressFiscal.district}
                  onChange={(e) => setAddressFiscal((s) => ({ ...s, district: e.target.value }))}
                  disabled={loading || saving}
                  placeholder="Ex: Centro"
                />
              </Field>

              <Field label="Cidade">
                <Input
                  value={addressFiscal.city}
                  onChange={(e) => setAddressFiscal((s) => ({ ...s, city: e.target.value }))}
                  disabled={loading || saving}
                  placeholder="Ex: Orizona"
                />
              </Field>

              <Field label="UF">
                <Select
                  value={addressFiscal.state}
                  onChange={(e) => setAddressFiscal((s) => ({ ...s, state: e.target.value }))}
                  disabled={loading || saving}
                >
                  {ufOptions().map((uf) => (
                    <option key={uf || "empty"} value={uf}>
                      {uf ? uf : "Selecione"}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="md:col-span-3">
                <Field label="Complemento">
                  <Input
                    value={addressFiscal.complement}
                    onChange={(e) => setAddressFiscal((s) => ({ ...s, complement: e.target.value }))}
                    disabled={loading || saving}
                    placeholder="Ex: Casa, Galpão, Km 12..."
                  />
                </Field>
              </div>
            </div>

            {/* Toggle produção */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Toggle
                checked={productionSameAsFiscal}
                onChange={(v) => {
                  setProductionSameAsFiscal(v);
                  if (v) setAddressProduction(addressFiscal);
                }}
                label="O endereço de produção é o mesmo do fiscal"
                hint="Se desmarcar, você poderá informar um endereço de produção diferente."
              />

              <div className="rounded-2xl border border-lv-border bg-white/60 p-3">
                <div className="text-sm font-medium text-lv-fg">Dica</div>
                <div className="mt-0.5 text-xs text-lv-muted">
                  Se você tem fazendas/locais diferentes, use o endereço de produção para ajudar na organização.
                </div>
              </div>
            </div>

            {/* Produção */}
            {!productionSameAsFiscal ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <div className="text-sm font-semibold text-lv-fg">Endereço da produção</div>
                  <p className="mt-1 text-sm text-lv-muted">Endereço do local onde os animais estão.</p>
                </div>

                <Field label="CEP">
                  <Input
                    value={formatCep(addressProduction.zip_code)}
                    onChange={(e) => setAddressProduction((s) => ({ ...s, zip_code: formatCep(e.target.value) }))}
                    disabled={loading || saving}
                    placeholder="00000-000"
                  />
                </Field>

                <Field label="Rua">
                  <Input
                    value={addressProduction.street}
                    onChange={(e) => setAddressProduction((s) => ({ ...s, street: e.target.value }))}
                    disabled={loading || saving}
                    placeholder="Rua / Avenida"
                  />
                </Field>

                <Field label="Número">
                  <Input
                    value={addressProduction.number}
                    onChange={(e) => setAddressProduction((s) => ({ ...s, number: e.target.value }))}
                    disabled={loading || saving}
                    placeholder="Ex: 123"
                  />
                </Field>

                <Field label="Bairro (distrito)">
                  <Input
                    value={addressProduction.district}
                    onChange={(e) => setAddressProduction((s) => ({ ...s, district: e.target.value }))}
                    disabled={loading || saving}
                    placeholder="Ex: Zona rural"
                  />
                </Field>

                <Field label="Cidade">
                  <Input
                    value={addressProduction.city}
                    onChange={(e) => setAddressProduction((s) => ({ ...s, city: e.target.value }))}
                    disabled={loading || saving}
                    placeholder="Ex: Orizona"
                  />
                </Field>

                <Field label="UF">
                  <Select
                    value={addressProduction.state}
                    onChange={(e) => setAddressProduction((s) => ({ ...s, state: e.target.value }))}
                    disabled={loading || saving}
                  >
                    {ufOptions().map((uf) => (
                      <option key={uf || "empty"} value={uf}>
                        {uf ? uf : "Selecione"}
                      </option>
                    ))}
                  </Select>
                </Field>

                <div className="md:col-span-3">
                  <Field label="Complemento">
                    <Input
                      value={addressProduction.complement}
                      onChange={(e) => setAddressProduction((s) => ({ ...s, complement: e.target.value }))}
                      disabled={loading || saving}
                      placeholder="Ex: Fazenda X, Km 15"
                    />
                  </Field>
                </div>
              </div>
            ) : null}

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
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className={[
              "rounded-xl px-4 py-2 text-sm font-medium text-white transition",
              canSubmit
                ? "bg-lv-green hover:bg-lv-green/90 shadow-[0_10px_20px_rgba(15,82,50,0.18)]"
                : "bg-lv-green/40 cursor-not-allowed",
            ].join(" ")}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>

          <button
            type="button"
            onClick={load}
            disabled={loading || saving}
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
