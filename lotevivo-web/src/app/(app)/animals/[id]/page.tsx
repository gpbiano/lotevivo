"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiGet, apiPostForm } from "@/lib/api";

type Animal = {
  id: string;
  tenant_id: string;
  species: string;
  tag_id: string | null;
  name: string | null;
  sex: string;
  breed: string | null;
  birth_date: string | null;
  origin_type: string;
  supplier_id: string | null;
  supplier_name: string | null; // você já adicionou no banco
  status: string;
  current_lot_id: string | null;
  current_location_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  photo_url?: string | null;
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

function formatarDataBr(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

function formatarSomenteDataBr(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function traduzirEspecie(species: string) {
  const s = String(species || "").toLowerCase();
  if (s.includes("bov")) return "Bovinos";
  if (s.includes("ave") || s.includes("chicken")) return "Aves";
  if (s.includes("sui")) return "Suínos";
  if (s.includes("ovi")) return "Ovinos";
  if (s.includes("cap")) return "Caprinos";
  if (s.includes("equ")) return "Equinos";
  return species || "—";
}

function traduzirSexo(sex: string) {
  const s = String(sex || "").toLowerCase();
  if (s === "female" || s === "f") return "Fêmea";
  if (s === "male" || s === "m") return "Macho";
  return sex || "—";
}

function traduzirStatus(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "active" || s === "ativo") return "Ativo";
  if (s === "inactive" || s === "inativo") return "Inativo";
  if (s === "sold" || s === "vendido") return "Vendido";
  if (s === "dead" || s === "morto") return "Morto";
  return status || "—";
}

function traduzirOrigem(origin: string) {
  const o = String(origin || "").toLowerCase();
  if (o === "born") return "Nascido no criatório";
  if (o === "purchase") return "Compra";
  if (o === "transfer") return "Transferência";
  // caso seu enum esteja com outro texto:
  if (o.includes("sup")) return "Fornecedor"; // fallback
  return origin || "—";
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-3 border-b border-lv-border last:border-b-0">
      <div className="text-sm font-medium text-lv-fg">{label}</div>
      <div className="md:col-span-2 text-sm text-lv-fg/90">{value}</div>
    </div>
  );
}

export default function AnimalDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [item, setItem] = useState<Animal | null>(null);
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const titulo = useMemo(() => {
    if (!item) return "Detalhe do animal";
    return item.tag_id || item.name || "Animal";
  }, [item]);

  async function carregar() {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await apiGet<{ item: Animal }>(`/animals/${id}`);
      setItem(res.item);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar o animal.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarFoto() {
    if (!id) return;
    setLoadingPhoto(true);
    setPhotoError(null);

    try {
      const res = await apiGet<{ url: string | null }>(`/animals/${id}/photo-url`);
      setPhotoSignedUrl(res.url ?? null);
    } catch (e: any) {
      setPhotoError(e?.message ?? "Falha ao carregar a foto.");
      setPhotoSignedUrl(null);
    } finally {
      setLoadingPhoto(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // carrega foto depois do item
    if (!item?.id) return;
    carregarFoto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  async function onUploadFoto(file: File) {
    if (!id) return;
    setSavingPhoto(true);
    setPhotoError(null);

    try {
      const form = new FormData();
      form.append("file", file);

      await apiPostForm<{ item: { id: string; photo_url: string } }>(
        `/animals/${id}/photo`,
        form
      );

      await carregarFoto();
    } catch (e: any) {
      setPhotoError(e?.message ?? "Não foi possível enviar a foto.");
    } finally {
      setSavingPhoto(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={titulo}
        subtitle="Confira identificação, origem, status, vínculos e foto do animal."
        actions={
          <>
            <Link
              href="/animals"
              className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
            >
              Voltar
            </Link>
            <Link
              href={`/animals/${id}/weighings`}
              className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
            >
              Ver pesagens
            </Link>
          </>
        }
      />

      {error ? (
        <Card>
          <div className="p-5">
            <div className="text-sm font-semibold text-lv-fg">Falha ao carregar</div>
            <p className="mt-1 text-sm text-lv-muted">{error}</p>
            <button
              onClick={carregar}
              className="mt-4 rounded-xl bg-lv-green px-4 py-2 text-sm font-medium text-white hover:bg-lv-green/90 transition"
            >
              Tentar novamente
            </button>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="p-4 md:p-5 border-b border-lv-border flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-lv-fg">Foto do animal</div>
                <p className="mt-1 text-sm text-lv-muted">
                  A foto fica armazenada com segurança (acesso por URL assinada).
                </p>
              </div>
            </div>

            <div className="p-4 md:p-5">
              <div className="flex flex-col md:flex-row gap-4 md:items-start">
                <div className="w-full md:w-[240px]">
                  <div className="aspect-square rounded-2xl border border-lv-border bg-white/60 overflow-hidden grid place-items-center">
                    {loadingPhoto ? (
                      <div className="text-sm text-lv-muted">Carregando foto...</div>
                    ) : photoSignedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoSignedUrl}
                        alt="Foto do animal"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="p-6 text-center">
                        <div className="text-sm font-semibold text-lv-fg">Sem foto</div>
                        <p className="mt-1 text-sm text-lv-muted">
                          Envie uma foto para facilitar a identificação.
                        </p>
                      </div>
                    )}
                  </div>

                  {photoError && (
                    <div className="mt-3 rounded-2xl border border-lv-border bg-white/60 p-3">
                      <div className="text-sm font-semibold text-lv-fg">Falha na foto</div>
                      <p className="mt-1 text-sm text-lv-muted">{photoError}</p>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
                    <div className="text-sm font-semibold text-lv-fg">Atualizar foto</div>
                    <p className="mt-1 text-sm text-lv-muted">
                      Formatos aceitos: JPG, PNG, WEBP. Tamanho recomendado: até 8MB.
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label
                        className={[
                          "inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-white transition",
                          savingPhoto
                            ? "bg-lv-green/50 cursor-not-allowed"
                            : "bg-lv-green hover:bg-lv-green/90 shadow-[0_10px_20px_rgba(15,82,50,0.18)]",
                        ].join(" ")}
                      >
                        {savingPhoto ? "Enviando..." : "Escolher foto"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={savingPhoto}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onUploadFoto(f);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={carregarFoto}
                        disabled={savingPhoto || loadingPhoto}
                        className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition disabled:opacity-60"
                      >
                        Recarregar foto
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
                    <div className="text-sm font-semibold text-lv-fg">Dica</div>
                    <p className="mt-1 text-sm text-lv-muted">
                      Se você trocar a foto, a nova substitui a anterior no Storage e o sistema
                      atualiza automaticamente a visualização.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4 md:p-5 border-b border-lv-border">
              <div className="text-sm font-semibold text-lv-fg">Dados do animal</div>
              <p className="mt-1 text-sm text-lv-muted">
                Aqui mostramos apenas informações úteis ao usuário (sem IDs internos desnecessários).
              </p>
            </div>

            <div className="p-4 md:p-5 rounded-2xl border border-lv-border bg-white/60">
              {loading || !item ? (
                <div className="text-sm text-lv-muted">Carregando...</div>
              ) : (
                <div>
                  <Row label="Identificação (brinco)" value={item.tag_id || "—"} />
                  <Row label="Nome" value={item.name || "—"} />
                  <Row label="Espécie" value={traduzirEspecie(item.species)} />
                  <Row label="Sexo" value={traduzirSexo(item.sex)} />
                  <Row label="Raça" value={item.breed || "—"} />
                  <Row label="Data de nascimento" value={formatarSomenteDataBr(item.birth_date)} />
                  <Row label="Origem" value={traduzirOrigem(item.origin_type)} />
                  <Row
                    label="Fornecedor"
                    value={item.supplier_name || (item.supplier_id ? "Fornecedor cadastrado" : "—")}
                  />
                  <Row label="Status" value={traduzirStatus(item.status)} />
                  <Row label="Lote atual" value={item.current_lot_id ? "Vinculado a um lote" : "—"} />
                  <Row label="Local atual" value={item.current_location_id ? "Vinculado a um local" : "—"} />
                  <Row label="Observações" value={item.notes || "—"} />
                  <Row label="Criado em" value={formatarDataBr(item.created_at)} />
                  <Row label="Atualizado em" value={formatarDataBr(item.updated_at)} />
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

