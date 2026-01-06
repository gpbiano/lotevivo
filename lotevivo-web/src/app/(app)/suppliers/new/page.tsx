"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getToken } from "@/lib/auth";

type Supplier = {
  id: string;
  tenant_id: string;
  type: string | null;
  legal_name: string | null;
  trade_name: string | null;
  document: string | null;
  state_registration: string | null;
  notes: string | null;
  name: string | null;
};

type SupplierAddress = {
  id: string;
  tenant_id: string;
  supplier_id: string;
  zip_code: string | null;
  street: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  complement: string | null;
};

type SupplierContact = {
  id: string;
  tenant_id: string;
  supplier_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
};

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs text-lv-muted mb-1">{label}</div>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full px-3 py-2 rounded-xl bg-white/70 ring-1 ring-lv-border",
        "focus:outline-none focus:ring-lv-green/30 text-sm text-lv-fg placeholder:text-lv-muted",
        props.className || "",
      ].join(" ")}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "w-full px-3 py-2 rounded-xl bg-white/70 ring-1 ring-lv-border",
        "focus:outline-none focus:ring-lv-green/30 text-sm text-lv-fg placeholder:text-lv-muted",
        props.className || "",
      ].join(" ")}
    />
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const cls =
    variant === "primary"
      ? "bg-lv-green text-white hover:bg-lv-green/90"
      : variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-white/60 ring-1 ring-lv-border text-lv-fg hover:bg-white/80";

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded-xl px-4 py-2 text-sm transition",
        cls,
        disabled ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function SupplierDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supplierId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [addresses, setAddresses] = useState<SupplierAddress[]>([]);
  const [contacts, setContacts] = useState<SupplierContact[]>([]);
  const [error, setError] = useState<string | null>(null);

  // forms
  const [addrForm, setAddrForm] = useState<Partial<SupplierAddress>>({});
  const [contactForm, setContactForm] = useState<Partial<SupplierContact>>({});

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

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      if (!supplierId || supplierId === "undefined") {
        setError("Fornecedor inválido.");
        return;
      }

      const companyId = await getActiveCompanyId();
      if (!companyId) {
        setError("Nenhuma empresa ativa selecionada.");
        return;
      }

      const { data: s, error: se } = await supabase
        .from("suppliers")
        .select(
          "id,tenant_id,type,legal_name,trade_name,document,state_registration,notes,name"
        )
        .eq("tenant_id", companyId)
        .eq("id", supplierId)
        .maybeSingle();

      if (se || !s) {
        setError("Fornecedor não encontrado.");
        return;
      }

      const { data: a } = await supabase
        .from("supplier_addresses")
        .select("id,tenant_id,supplier_id,zip_code,street,number,district,city,state,complement")
        .eq("tenant_id", companyId)
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false });

      const { data: c } = await supabase
        .from("supplier_contacts")
        .select("id,tenant_id,supplier_id,name,phone,email,role")
        .eq("tenant_id", companyId)
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false });

      setSupplier(s as Supplier);
      setAddresses((a ?? []) as SupplierAddress[]);
      setContacts((c ?? []) as SupplierContact[]);
    } catch {
      setError("Não foi possível carregar o fornecedor.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  const displayName = useMemo(() => {
    if (!supplier) return "Fornecedor";
    return supplier.name || supplier.trade_name || supplier.legal_name || "Fornecedor";
  }, [supplier]);

  async function createNewSupplier() {
    setSaving(true);
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
          type: null,
          legal_name: null,
          trade_name: null,
          document: null,
          state_registration: null,
          notes: null,
        })
        .select("id")
        .single();

      if (e || !data?.id) throw e;

      router.push(`/suppliers/${data.id}`);
    } catch {
      setError("Não foi possível criar um novo fornecedor.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSupplier() {
    if (!supplier) return;
    setSaving(true);
    setError(null);

    try {
      const companyId = await getActiveCompanyId();
      if (!companyId) throw new Error();

      const { error: e } = await supabase
        .from("suppliers")
        .update({
          name: supplier.name,
          type: supplier.type,
          legal_name: supplier.legal_name,
          trade_name: supplier.trade_name,
          document: supplier.document,
          state_registration: supplier.state_registration,
          notes: supplier.notes,
        })
        .eq("tenant_id", companyId)
        .eq("id", supplier.id);

      if (e) throw e;
      await refresh();
    } catch {
      setError("Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  async function addAddress() {
    setSaving(true);
    setError(null);

    try {
      const companyId = await getActiveCompanyId();
      if (!companyId || !supplierId) throw new Error();

      const { error: e } = await supabase.from("supplier_addresses").insert({
        tenant_id: companyId,
        supplier_id: supplierId,
        zip_code: addrForm.zip_code ?? null,
        street: addrForm.street ?? null,
        number: addrForm.number ?? null,
        district: addrForm.district ?? null,
        city: addrForm.city ?? null,
        state: addrForm.state ?? null,
        complement: addrForm.complement ?? null,
      });

      if (e) throw e;

      setAddrForm({});
      await refresh();
    } catch {
      setError("Não foi possível adicionar o endereço.");
    } finally {
      setSaving(false);
    }
  }

  async function removeAddress(id: string) {
    setSaving(true);
    setError(null);

    try {
      const companyId = await getActiveCompanyId();
      if (!companyId) throw new Error();

      const { error: e } = await supabase
        .from("supplier_addresses")
        .delete()
        .eq("tenant_id", companyId)
        .eq("id", id);

      if (e) throw e;

      await refresh();
    } catch {
      setError("Não foi possível remover o endereço.");
    } finally {
      setSaving(false);
    }
  }

  async function addContact() {
    setSaving(true);
    setError(null);

    try {
      const companyId = await getActiveCompanyId();
      if (!companyId || !supplierId) throw new Error();

      const { error: e } = await supabase.from("supplier_contacts").insert({
        tenant_id: companyId,
        supplier_id: supplierId,
        name: contactForm.name ?? null,
        phone: contactForm.phone ?? null,
        email: contactForm.email ?? null,
        role: contactForm.role ?? null,
      });

      if (e) throw e;

      setContactForm({});
      await refresh();
    } catch {
      setError("Não foi possível adicionar o contato.");
    } finally {
      setSaving(false);
    }
  }

  async function removeContact(id: string) {
    setSaving(true);
    setError(null);

    try {
      const companyId = await getActiveCompanyId();
      if (!companyId) throw new Error();

      const { error: e } = await supabase
        .from("supplier_contacts")
        .delete()
        .eq("tenant_id", companyId)
        .eq("id", id);

      if (e) throw e;

      await refresh();
    } catch {
      setError("Não foi possível remover o contato.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card
        title={loading ? "Carregando..." : displayName}
        subtitle="Dados do fornecedor, endereços e contatos."
        right={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={createNewSupplier} disabled={saving}>
              Novo fornecedor
            </Button>

            <Link
              href="/suppliers"
              className="rounded-xl px-4 py-2 text-sm bg-white/60 ring-1 ring-lv-border text-lv-fg hover:bg-white/80 transition"
            >
              Voltar
            </Link>

            <Button onClick={saveSupplier} disabled={loading || saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        }
      >
        {error && (
          <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-900/80">
            {error}
          </div>
        )}

        {/* Dados do fornecedor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Nome de exibição">
            <Input
              value={supplier?.name ?? ""}
              onChange={(e) => setSupplier((p) => (p ? { ...p, name: e.target.value } : p))}
              placeholder="Ex: Agropecuária Silva"
              disabled={loading}
            />
          </Field>

          <Field label="Nome fantasia">
            <Input
              value={supplier?.trade_name ?? ""}
              onChange={(e) =>
                setSupplier((p) => (p ? { ...p, trade_name: e.target.value } : p))
              }
              placeholder="Ex: Silva Agro"
              disabled={loading}
            />
          </Field>

          <Field label="Razão social">
            <Input
              value={supplier?.legal_name ?? ""}
              onChange={(e) =>
                setSupplier((p) => (p ? { ...p, legal_name: e.target.value } : p))
              }
              placeholder="Ex: Silva LTDA"
              disabled={loading}
            />
          </Field>

          <Field label="Documento (CPF/CNPJ)">
            <Input
              value={supplier?.document ?? ""}
              onChange={(e) =>
                setSupplier((p) => (p ? { ...p, document: e.target.value } : p))
              }
              placeholder="00.000.000/0000-00"
              disabled={loading}
            />
          </Field>

          <Field label="Inscrição estadual">
            <Input
              value={supplier?.state_registration ?? ""}
              onChange={(e) =>
                setSupplier((p) => (p ? { ...p, state_registration: e.target.value } : p))
              }
              placeholder="Opcional"
              disabled={loading}
            />
          </Field>

          <Field label="Tipo">
            <Input
              value={supplier?.type ?? ""}
              onChange={(e) => setSupplier((p) => (p ? { ...p, type: e.target.value } : p))}
              placeholder="Ex: insumos, serviços, transporte..."
              disabled={loading}
            />
          </Field>

          <div className="md:col-span-3">
            <Field label="Notas">
              <Textarea
                rows={4}
                value={supplier?.notes ?? ""}
                onChange={(e) => setSupplier((p) => (p ? { ...p, notes: e.target.value } : p))}
                placeholder="Observações importantes: acordos, prazos, histórico, preferências..."
                disabled={loading}
              />
            </Field>
          </div>
        </div>

        {/* Endereços */}
        <div className="mt-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-semibold text-lv-fg">Endereços</div>
              <div className="text-sm text-lv-muted">Cadastre endereços do fornecedor.</div>
            </div>
          </div>

          <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="CEP">
                <Input
                  value={addrForm.zip_code ?? ""}
                  onChange={(e) => setAddrForm((p) => ({ ...p, zip_code: e.target.value }))}
                  placeholder="00000-000"
                />
              </Field>
              <Field label="Rua">
                <Input
                  value={addrForm.street ?? ""}
                  onChange={(e) => setAddrForm((p) => ({ ...p, street: e.target.value }))}
                  placeholder="Rua / Avenida"
                />
              </Field>
              <Field label="Número">
                <Input
                  value={addrForm.number ?? ""}
                  onChange={(e) => setAddrForm((p) => ({ ...p, number: e.target.value }))}
                  placeholder="Nº"
                />
              </Field>

              <Field label="Bairro">
                <Input
                  value={addrForm.district ?? ""}
                  onChange={(e) => setAddrForm((p) => ({ ...p, district: e.target.value }))}
                  placeholder="Bairro"
                />
              </Field>
              <Field label="Cidade">
                <Input
                  value={addrForm.city ?? ""}
                  onChange={(e) => setAddrForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="Cidade"
                />
              </Field>
              <Field label="Estado (UF)">
                <Input
                  value={addrForm.state ?? ""}
                  onChange={(e) => setAddrForm((p) => ({ ...p, state: e.target.value }))}
                  placeholder="GO"
                />
              </Field>

              <div className="md:col-span-3">
                <Field label="Complemento">
                  <Input
                    value={addrForm.complement ?? ""}
                    onChange={(e) => setAddrForm((p) => ({ ...p, complement: e.target.value }))}
                    placeholder="Opcional"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-3">
              <Button onClick={addAddress} disabled={saving}>
                Adicionar endereço
              </Button>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {addresses.length === 0 ? (
              <div className="text-sm text-lv-muted">Nenhum endereço cadastrado.</div>
            ) : (
              addresses.map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl border border-lv-border bg-white/60 p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-lv-fg">
                      {(a.street ?? "—")}, {a.number ?? "s/n"} — {a.district ?? "—"}
                    </div>
                    <div className="text-sm text-lv-muted">
                      {a.city ?? "—"}/{a.state ?? "—"} • {a.zip_code ?? "—"}{" "}
                      {a.complement ? `• ${a.complement}` : ""}
                    </div>
                  </div>

                  <Button variant="danger" onClick={() => removeAddress(a.id)} disabled={saving}>
                    Remover
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contatos */}
        <div className="mt-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-semibold text-lv-fg">Contatos</div>
              <div className="text-sm text-lv-muted">
                Cadastre pessoas e canais de contato do fornecedor.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Nome">
                <Input
                  value={contactForm.name ?? ""}
                  onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nome do contato"
                />
              </Field>
              <Field label="Cargo / Função">
                <Input
                  value={contactForm.role ?? ""}
                  onChange={(e) => setContactForm((p) => ({ ...p, role: e.target.value }))}
                  placeholder="Ex: Vendas"
                />
              </Field>
              <Field label="Telefone">
                <Input
                  value={contactForm.phone ?? ""}
                  onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </Field>
              <Field label="E-mail">
                <Input
                  value={contactForm.email ?? ""}
                  onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@dominio.com"
                />
              </Field>
            </div>

            <div className="mt-3">
              <Button onClick={addContact} disabled={saving}>
                Adicionar contato
              </Button>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {contacts.length === 0 ? (
              <div className="text-sm text-lv-muted">Nenhum contato cadastrado.</div>
            ) : (
              contacts.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-lv-border bg-white/60 p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-lv-fg">
                      {c.name || "—"} {c.role ? `• ${c.role}` : ""}
                    </div>
                    <div className="text-sm text-lv-muted">
                      {c.phone || "—"} {c.email ? `• ${c.email}` : ""}
                    </div>
                  </div>

                  <Button variant="danger" onClick={() => removeContact(c.id)} disabled={saving}>
                    Remover
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
