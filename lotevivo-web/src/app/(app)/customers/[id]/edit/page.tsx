"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut } from "@/lib/api";

type Cliente = {
  id: string;
  tenant_id: string;
  type: string;
  name: string;
  trade_name: string | null;
  document: string | null;
  state_registration: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Contato = {
  id: string;
  customer_id: string;
  name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

type Endereco = {
  id: string;
  customer_id: string;
  label: string | null;
  zip_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
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

function InfoBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
      <div className="text-sm font-semibold text-lv-fg">{title}</div>
      <p className="mt-1 text-sm text-lv-muted">{text}</p>
    </div>
  );
}

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // cliente
  const [tipo, setTipo] = useState<"PF" | "PJ" | "OUTRO">("PJ");
  const [nome, setNome] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [documento, setDocumento] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);

  // contatos/endereço (MVP)
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [backendTemContatos, setBackendTemContatos] = useState(true);
  const [backendTemEnderecos, setBackendTemEnderecos] = useState(true);

  // form contato (rápido)
  const [cNome, setCNome] = useState("");
  const [cCargo, setCCargo] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cTelefone, setCTelefone] = useState("");
  const [cObs, setCObs] = useState("");

  // form endereço (rápido)
  const [eLabel, setELabel] = useState("Principal");
  const [eCep, setECep] = useState("");
  const [eRua, setERua] = useState("");
  const [eNumero, setENumero] = useState("");
  const [eComp, setEComp] = useState("");
  const [eBairro, setEBairro] = useState("");
  const [eCidade, setECidade] = useState("");
  const [eEstado, setEEstado] = useState("");
  const [ePais, setEPais] = useState("Brasil");

  const podeSalvar = useMemo(() => nome.trim().length >= 2 && !salvando, [nome, salvando]);

  async function carregarCliente() {
    setCarregando(true);
    setErro(null);

    try {
      const res = await apiGet<{ item: Cliente }>(`/customers/${id}`);
      const c = (res as any)?.item ?? (res as any);

      setTipo((String(c?.type ?? "PJ").toUpperCase() as any) || "PJ");
      setNome(c?.name ?? "");
      setNomeFantasia(c?.trade_name ?? "");
      setDocumento(c?.document ?? "");
      setInscricaoEstadual(c?.state_registration ?? "");
      setEmail(c?.email ?? "");
      setTelefone(c?.phone ?? "");
      setObservacoes(c?.notes ?? "");
      setAtivo(!!c?.is_active);
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao carregar cliente.");
    } finally {
      setCarregando(false);
    }
  }

  async function carregarContatos() {
    try {
      const res = await apiGet<{ items: Contato[] }>(`/customers/${id}/contacts?limit=200`);
      setContatos(res.items ?? []);
      setBackendTemContatos(true);
    } catch {
      setBackendTemContatos(false);
      setContatos([]);
    }
  }

  async function carregarEnderecos() {
    try {
      const res = await apiGet<{ items: Endereco[] }>(`/customers/${id}/addresses?limit=200`);
      setEnderecos(res.items ?? []);
      setBackendTemEnderecos(true);
    } catch {
      setBackendTemEnderecos(false);
      setEnderecos([]);
    }
  }

  useEffect(() => {
    if (!id) return;
    carregarCliente();
    carregarContatos();
    carregarEnderecos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSalvarCliente(e: React.FormEvent) {
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

      await apiPut(`/customers/${id}`, payload);

      router.refresh();
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao salvar alterações.");
    } finally {
      setSalvando(false);
    }
  }

  async function onAdicionarContato() {
    if (!backendTemContatos) return;
    try {
      await apiPost(`/customers/${id}/contacts`, {
        name: cNome.trim() || null,
        role: cCargo.trim() || null,
        email: cEmail.trim() || null,
        phone: cTelefone.trim() || null,
        notes: cObs.trim() || null,
      });
      setCNome("");
      setCCargo("");
      setCEmail("");
      setCTelefone("");
      setCObs("");
      await carregarContatos();
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao adicionar contato.");
    }
  }

  async function onAdicionarEndereco() {
    if (!backendTemEnderecos) return;
    try {
      await apiPost(`/customers/${id}/addresses`, {
        label: eLabel.trim() || null,
        zip_code: eCep.trim() || null,
        street: eRua.trim() || null,
        number: eNumero.trim() || null,
        complement: eComp.trim() || null,
        neighborhood: eBairro.trim() || null,
        city: eCidade.trim() || null,
        state: eEstado.trim() || null,
        country: ePais.trim() || null,
      });
      await carregarEnderecos();
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao adicionar endereço.");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Editar cliente"
        subtitle="Atualize os dados do cliente, contatos e endereços."
        actions={
          <Link
            href="/customers"
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
          >
            Voltar
          </Link>
        }
      />

      {carregando ? (
        <Card>
          <div className="p-6 text-sm text-lv-muted">Carregando dados...</div>
        </Card>
      ) : (
        <form onSubmit={onSalvarCliente} className="space-y-5">
          <Card>
            <div className="p-4 md:p-5 border-b border-lv-border">
              <div className="text-sm font-semibold text-lv-fg">Dados do cliente</div>
            </div>

            <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tipo de cliente">
                <Select value={tipo} onChange={(e) => setTipo(e.target.value as any)} disabled={salvando}>
                  <option value="PJ">Pessoa Jurídica (PJ)</option>
                  <option value="PF">Pessoa Física (PF)</option>
                  <option value="OUTRO">Outro</option>
                </Select>
              </Field>

              <Field label="Status">
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
                  <div className="text-sm font-semibold text-lv-fg">Atenção</div>
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
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>

          {/* CONTATOS */}
          <Card>
            <div className="p-4 md:p-5 border-b border-lv-border flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-lv-fg">Contatos do cliente</div>
                <div className="text-sm text-lv-muted">Pessoas e canais de contato.</div>
              </div>
              <div className="text-sm text-lv-muted">{contatos.length} itens</div>
            </div>

            <div className="p-4 md:p-5 space-y-4">
              {!backendTemContatos ? (
                <InfoBox title="Contatos" text="Ainda não disponível no backend. Quando as rotas forem criadas, essa seção passa a funcionar automaticamente." />
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Nome do contato">
                      <Input value={cNome} onChange={(e) => setCNome(e.target.value)} placeholder="Ex: João" />
                    </Field>
                    <Field label="Cargo/Função">
                      <Input value={cCargo} onChange={(e) => setCCargo(e.target.value)} placeholder="Ex: Compras" />
                    </Field>
                    <Field label="E-mail">
                      <Input value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="Ex: joao@empresa.com" />
                    </Field>
                    <Field label="Telefone">
                      <Input value={cTelefone} onChange={(e) => setCTelefone(e.target.value)} placeholder="Ex: (11) 99999-9999" />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Observações">
                        <Textarea value={cObs} onChange={(e) => setCObs(e.target.value)} rows={3} />
                      </Field>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onAdicionarContato}
                    className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
                  >
                    Adicionar contato
                  </button>

                  <div className="divide-y divide-lv-border rounded-2xl border border-lv-border bg-white/60 overflow-hidden">
                    {contatos.length === 0 ? (
                      <div className="p-4 text-sm text-lv-muted">Nenhum contato cadastrado.</div>
                    ) : (
                      contatos.map((c) => (
                        <div key={c.id} className="p-4">
                          <div className="text-sm font-semibold text-lv-fg">{c.name || "Contato sem nome"}</div>
                          <div className="mt-1 text-xs text-lv-muted">
                            {c.role ? `Função: ${c.role} • ` : ""}
                            {c.phone ? `Telefone: ${c.phone} • ` : ""}
                            {c.email ? `E-mail: ${c.email}` : ""}
                          </div>
                          {c.notes ? <div className="mt-2 text-sm text-lv-muted">{c.notes}</div> : null}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* ENDEREÇOS */}
          <Card>
            <div className="p-4 md:p-5 border-b border-lv-border flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-lv-fg">Endereços do cliente</div>
                <div className="text-sm text-lv-muted">Locais de cobrança, entrega ou referência.</div>
              </div>
              <div className="text-sm text-lv-muted">{enderecos.length} itens</div>
            </div>

            <div className="p-4 md:p-5 space-y-4">
              {!backendTemEnderecos ? (
                <InfoBox title="Endereços" text="Ainda não disponível no backend. Quando as rotas forem criadas, essa seção passa a funcionar automaticamente." />
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Identificação" hint="Ex: Principal / Entrega">
                      <Input value={eLabel} onChange={(e) => setELabel(e.target.value)} />
                    </Field>
                    <Field label="CEP">
                      <Input value={eCep} onChange={(e) => setECep(e.target.value)} />
                    </Field>
                    <Field label="Rua">
                      <Input value={eRua} onChange={(e) => setERua(e.target.value)} />
                    </Field>
                    <Field label="Número">
                      <Input value={eNumero} onChange={(e) => setENumero(e.target.value)} />
                    </Field>
                    <Field label="Complemento">
                      <Input value={eComp} onChange={(e) => setEComp(e.target.value)} />
                    </Field>
                    <Field label="Bairro">
                      <Input value={eBairro} onChange={(e) => setEBairro(e.target.value)} />
                    </Field>
                    <Field label="Cidade">
                      <Input value={eCidade} onChange={(e) => setECidade(e.target.value)} />
                    </Field>
                    <Field label="Estado">
                      <Input value={eEstado} onChange={(e) => setEEstado(e.target.value)} />
                    </Field>
                    <Field label="País">
                      <Input value={ePais} onChange={(e) => setEPais(e.target.value)} />
                    </Field>
                  </div>

                  <button
                    type="button"
                    onClick={onAdicionarEndereco}
                    className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
                  >
                    Adicionar endereço
                  </button>

                  <div className="divide-y divide-lv-border rounded-2xl border border-lv-border bg-white/60 overflow-hidden">
                    {enderecos.length === 0 ? (
                      <div className="p-4 text-sm text-lv-muted">Nenhum endereço cadastrado.</div>
                    ) : (
                      enderecos.map((e) => (
                        <div key={e.id} className="p-4">
                          <div className="text-sm font-semibold text-lv-fg">{e.label || "Endereço"}</div>
                          <div className="mt-1 text-sm text-lv-muted">
                            {[e.street, e.number].filter(Boolean).join(", ")}
                            {e.complement ? ` • ${e.complement}` : ""}
                          </div>
                          <div className="mt-1 text-sm text-lv-muted">
                            {[e.neighborhood, e.city, e.state].filter(Boolean).join(" • ")}
                          </div>
                          <div className="mt-1 text-xs text-lv-muted">
                            {[e.zip_code ? `CEP: ${e.zip_code}` : null, e.country].filter(Boolean).join(" • ")}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </Card>
        </form>
      )}
    </div>
  );
}
