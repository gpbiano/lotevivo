"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut } from "@/lib/api";

/* =========================
   TIPOS
========================= */
type Mode = "new" | "edit";
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

type Props = {
  mode: Mode;
  tenantId?: string;
};

/* =========================
   HELPERS
========================= */
function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function formatCep(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function ufOptions() {
  return [
    "",
    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
    "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
  ];
}

function emptyAddress(): Address {
  return {
    zip_code: "",
    street: "",
    number: "",
    district: "",
    city: "",
    state: "",
    complement: "",
  };
}

/* =========================
   COMPONENTE
========================= */
export default function TenantForm({ mode, tenantId }: Props) {
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // identificação
  const [personType, setPersonType] = useState<PersonType>("PJ");
  const [document, setDocument] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [stateRegistration, setStateRegistration] = useState("");
  const [pfHasIE, setPfHasIE] = useState(false);

  // contato
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // endereços
  const [sameAddress, setSameAddress] = useState(true);
  const [fiscal, setFiscal] = useState<Address>(emptyAddress());
  const [production, setProduction] = useState<Address>(emptyAddress());

  const canEditIE = personType === "PJ" || (personType === "PF" && pfHasIE);

  /* =========================
     LOAD (EDIT)
  ========================= */
  async function load() {
    if (mode !== "edit" || !tenantId) return;

    setLoading(true);
    try {
      const res = await apiGet(`/admin/tenants/${tenantId}`);

      const p = res.profile;
      setPersonType(p.person_type);
      setDocument(p.document ?? "");
      setLegalName(p.legal_name ?? "");
      setTradeName(p.trade_name ?? "");
      setStateRegistration(p.state_registration ?? "");
      setEmail(p.email ?? "");
      setPhone(p.phone ?? "");

      if (p.person_type === "PF" && p.state_registration) {
        setPfHasIE(true);
      }

      setFiscal(res.addresses?.fiscal ?? emptyAddress());
      setProduction(res.addresses?.production ?? emptyAddress());

      setSameAddress(
        JSON.stringify(res.addresses?.fiscal) ===
          JSON.stringify(res.addresses?.production)
      );
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar tenant");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  /* =========================
     SAVE
  ========================= */
  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        person_type: personType,
        document: onlyDigits(document),
        legal_name: legalName,
        trade_name: tradeName || null,
        state_registration: canEditIE ? stateRegistration || null : null,
        email: email || null,
        phone: phone || null,
        production_same_as_fiscal: sameAddress,
        address_fiscal: {
          ...fiscal,
          zip_code: formatCep(fiscal.zip_code),
        },
        address_production: sameAddress
          ? undefined
          : {
              ...production,
              zip_code: formatCep(production.zip_code),
            },
      };

      if (mode === "new") {
        await apiPost("/admin/tenants", payload);
        setSuccess("Empresa criada com sucesso.");
      } else {
        await apiPut(`/admin/tenants/${tenantId}`, payload);
        setSuccess("Empresa atualizada com sucesso.");
      }
    } catch (e: any) {
      setError(e.message ?? "Erro ao salvar empresa");
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     RENDER
  ========================= */
  if (loading) {
    return (
      <div className="rounded-2xl border border-lv-border bg-white/60 p-6 text-sm text-lv-muted">
        Carregando dados da empresa…
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
      {/* IDENTIFICAÇÃO */}
      <div className="rounded-2xl border border-lv-border bg-white/70 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-lv-fg">Identificação</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={personType}
            onChange={(e) => setPersonType(e.target.value as PersonType)}
            className="rounded-xl border border-lv-border px-3 py-2 text-sm"
          >
            <option value="PJ">Pessoa jurídica (PJ)</option>
            <option value="PF">Pessoa física (PF)</option>
          </select>

          <input
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            placeholder={personType === "PJ" ? "CNPJ" : "CPF"}
            className="rounded-xl border border-lv-border px-3 py-2 text-sm"
          />

          <input
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder={personType === "PJ" ? "Razão social" : "Nome completo"}
            className="rounded-xl border border-lv-border px-3 py-2 text-sm"
          />

          <input
            value={tradeName}
            onChange={(e) => setTradeName(e.target.value)}
            placeholder="Nome fantasia (opcional)"
            className="rounded-xl border border-lv-border px-3 py-2 text-sm"
          />
        </div>

        {personType === "PF" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pfHasIE}
              onChange={(e) => setPfHasIE(e.target.checked)}
            />
            Produtor rural com inscrição estadual
          </label>
        )}

        <input
          value={stateRegistration}
          onChange={(e) => setStateRegistration(e.target.value)}
          disabled={!canEditIE}
          placeholder="Inscrição estadual"
          className="rounded-xl border border-lv-border px-3 py-2 text-sm disabled:opacity-60"
        />
      </div>

      {/* ENDEREÇO FISCAL */}
      <AddressBlock
        title="Endereço fiscal"
        address={fiscal}
        onChange={setFiscal}
      />

      {/* MESMO ENDEREÇO */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={sameAddress}
          onChange={(e) => setSameAddress(e.target.checked)}
        />
        Endereço de produção igual ao fiscal
      </label>

      {!sameAddress && (
        <AddressBlock
          title="Endereço de produção"
          address={production}
          onChange={setProduction}
        />
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-lv-green px-4 py-2 text-sm font-medium text-white hover:bg-lv-green/90 disabled:opacity-60"
      >
        {saving ? "Salvando…" : mode === "new" ? "Criar empresa" : "Salvar alterações"}
      </button>
    </form>
  );
}

/* =========================
   SUBCOMPONENTE ENDEREÇO
========================= */
function AddressBlock({
  title,
  address,
  onChange,
}: {
  title: string;
  address: Address;
  onChange: (a: Address) => void;
}) {
  return (
    <div className="rounded-2xl border border-lv-border bg-white/70 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-lv-fg">{title}</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          value={formatCep(address.zip_code)}
          onChange={(e) => onChange({ ...address, zip_code: formatCep(e.target.value) })}
          placeholder="CEP"
          className="rounded-xl border border-lv-border px-3 py-2 text-sm"
        />

        <input
          value={address.street}
          onChange={(e) => onChange({ ...address, street: e.target.value })}
          placeholder="Rua"
          className="rounded-xl border border-lv-border px-3 py-2 text-sm"
        />

        <input
          value={address.number}
          onChange={(e) => onChange({ ...address, number: e.target.value })}
          placeholder="Número"
          className="rounded-xl border border-lv-border px-3 py-2 text-sm"
        />

        <input
          value={address.district}
          onChange={(e) => onChange({ ...address, district: e.target.value })}
          placeholder="Bairro"
          className="rounded-xl border border-lv-border px-3 py-2 text-sm"
        />

        <input
          value={address.city}
          onChange={(e) => onChange({ ...address, city: e.target.value })}
          placeholder="Cidade"
          className="rounded-xl border border-lv-border px-3 py-2 text-sm"
        />

        <select
          value={address.state}
          onChange={(e) => onChange({ ...address, state: e.target.value })}
          className="rounded-xl border border-lv-border px-3 py-2 text-sm"
        >
          {ufOptions().map((uf) => (
            <option key={uf} value={uf}>
              {uf || "UF"}
            </option>
          ))}
        </select>

        <input
          value={address.complement}
          onChange={(e) => onChange({ ...address, complement: e.target.value })}
          placeholder="Complemento"
          className="md:col-span-3 rounded-xl border border-lv-border px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
