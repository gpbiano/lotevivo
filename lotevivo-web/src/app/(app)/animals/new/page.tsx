"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost, apiPostForm } from "@/lib/api";

type Species = "bovinos" | "aves" | "suinos" | "ovinos" | "caprinos" | "equinos";
type Sex = "male" | "female";
type OriginType = "born" | "purchase" | "transfer";
type AnimalStatus = "active" | "sold" | "dead" | "inactive";

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

export default function NewAnimalPage() {
  const router = useRouter();

  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [tagId, setTagId] = useState("");
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("bovinos");
  const [sex, setSex] = useState<Sex>("female");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState(""); // yyyy-mm-dd
  const [originType, setOriginType] = useState<OriginType>("born");
  const [status, setStatus] = useState<AnimalStatus>("active");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const hasId = tagId.trim().length > 0 || name.trim().length > 0;
    return hasId && !!species && !!sex && !loading && !uploadingPhoto;
  }, [tagId, name, species, sex, loading, uploadingPhoto]);

  async function uploadPhoto(animalId: string, file: File) {
    const form = new FormData();
    form.append("file", file);

    setUploadingPhoto(true);
    try {
      await apiPostForm(`/animals/${animalId}/photo`, form);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError("Preencha pelo menos Brinco/Identificação ou Nome.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tag_id: tagId.trim() || null,
        name: name.trim() || null,
        species,
        sex,
        breed: breed.trim() || null,
        birth_date: birthDate || null,
        origin_type: originType,
        status,
        notes: notes.trim() || null,
      };

      const created = await apiPost<{ item: { id: string } }>("/animals", payload);

      const newId = created?.item?.id;
      if (!newId) throw new Error("Não foi possível obter o ID do animal criado.");

      if (photoFile) {
        await uploadPhoto(newId, photoFile);
      }

      router.replace(`/animals/${newId}`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao cadastrar animal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cadastrar animal"
        subtitle="Crie o dossiê do animal (dados + foto) para facilitar identificação, pesagens e relatórios."
        actions={
          <Link
            href="/animals"
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
          >
            Voltar
          </Link>
        }
      />

      <form onSubmit={onSubmit} className="space-y-5">
        <Card>
          <div className="p-4 md:p-5 border-b border-lv-border">
            <div className="text-sm font-semibold text-lv-fg">Foto do animal</div>
            <p className="mt-1 text-sm text-lv-muted">
              Você pode enviar agora ou depois no detalhe do animal. A foto fica em armazenamento privado.
            </p>
          </div>

          <div className="p-4 md:p-5 flex flex-col md:flex-row gap-4 md:items-start">
            <div className="w-full md:w-[240px]">
              <div className="aspect-square rounded-2xl border border-lv-border bg-white/60 overflow-hidden grid place-items-center">
                {photoFile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={URL.createObjectURL(photoFile)}
                    alt="Prévia da foto"
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

              <div className="mt-3 flex flex-wrap gap-2">
                <label
                  className={[
                    "inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-white transition",
                    loading || uploadingPhoto
                      ? "bg-lv-green/50 cursor-not-allowed"
                      : "bg-lv-green hover:bg-lv-green/90 shadow-[0_10px_20px_rgba(15,82,50,0.18)]",
                  ].join(" ")}
                >
                  Escolher foto
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={loading || uploadingPhoto}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setPhotoFile(f ?? null);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>

                <button
                  type="button"
                  className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition disabled:opacity-60"
                  disabled={loading || uploadingPhoto || !photoFile}
                  onClick={() => setPhotoFile(null)}
                >
                  Remover
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
                <div className="text-sm font-semibold text-lv-fg">Recomendações</div>
                <ul className="mt-2 text-sm text-lv-muted list-disc pl-5 space-y-1">
                  <li>Use uma foto nítida do animal.</li>
                  <li>Tamanho recomendado: até 8MB.</li>
                  <li>Formatos: JPG, PNG, WEBP.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-lv-border bg-white/60 p-4">
                <div className="text-sm font-semibold text-lv-fg">Dossiê</div>
                <p className="mt-1 text-sm text-lv-muted">
                  Após salvar, você poderá ver o detalhe do animal e atualizar foto e informações.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 md:p-5 border-b border-lv-border">
            <div className="text-sm font-semibold text-lv-fg">Dados do animal</div>
            <p className="mt-1 text-sm text-lv-muted">
              Preencha os principais dados. O mínimo é: espécie + sexo + (brinco ou nome).
            </p>
          </div>

          <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Brinco / Identificação" hint="Ex.: BR-1023">
              <Input
                value={tagId}
                onChange={(e) => setTagId(e.target.value)}
                placeholder="Informe o brinco/ID"
                disabled={loading || uploadingPhoto}
              />
            </Field>

            <Field label="Nome (opcional)" hint="Ex.: Estrela">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do animal"
                disabled={loading || uploadingPhoto}
              />
            </Field>

            <Field label="Espécie">
              <Select
                value={species}
                onChange={(e) => setSpecies(e.target.value as Species)}
                disabled={loading || uploadingPhoto}
              >
                <option value="bovinos">Bovinos</option>
                <option value="aves">Aves</option>
                <option value="suinos">Suínos</option>
                <option value="ovinos">Ovinos</option>
                <option value="caprinos">Caprinos</option>
                <option value="equinos">Equinos</option>
              </Select>
            </Field>

            <Field label="Sexo">
              <Select
                value={sex}
                onChange={(e) => setSex(e.target.value as Sex)}
                disabled={loading || uploadingPhoto}
              >
                <option value="female">Fêmea</option>
                <option value="male">Macho</option>
              </Select>
            </Field>

            <Field label="Raça (opcional)" hint="Ex.: Nelore">
              <Input
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="Raça do animal"
                disabled={loading || uploadingPhoto}
              />
            </Field>

            <Field label="Data de nascimento (opcional)">
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                disabled={loading || uploadingPhoto}
              />
            </Field>

            <Field label="Origem">
              <Select
                value={originType}
                onChange={(e) => setOriginType(e.target.value as OriginType)}
                disabled={loading || uploadingPhoto}
              >
                <option value="born">Nascido no criatório</option>
                <option value="purchase">Compra</option>
                <option value="transfer">Transferência</option>
              </Select>
            </Field>

            <Field label="Status">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as AnimalStatus)}
                disabled={loading || uploadingPhoto}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="sold">Vendido</option>
                <option value="dead">Morto</option>
              </Select>
            </Field>

            <div className="md:col-span-2">
              <Field label="Observações (opcional)">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Anotações sobre o animal..."
                  disabled={loading || uploadingPhoto}
                />
              </Field>
            </div>

            {error && (
              <div className="md:col-span-2 rounded-2xl border border-lv-border bg-white/60 p-4">
                <div className="text-sm font-semibold text-lv-fg">Falha ao salvar</div>
                <p className="mt-1 text-sm text-lv-muted">{error}</p>
              </div>
            )}
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
            {uploadingPhoto
              ? "Enviando foto..."
              : loading
              ? "Salvando..."
              : "Cadastrar animal"}
          </button>

          <Link
            href="/animals"
            className="rounded-xl border border-lv-border bg-white/70 px-4 py-2 text-sm text-lv-fg hover:bg-white transition"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
