import { supabaseAdmin } from "../../config/supabase";
import type { TenantProfileUpsertInput } from "./schemas";

const BUCKET = "tenant-logos";

type AddressRow = {
  zip_code?: string | null;
  street?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  complement?: string | null;
};

export class TenantProfileService {
  private admin = supabaseAdmin();

  async get(tenantId: string) {
    const { data: profile, error: pErr } = await this.admin
      .from("tenant_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (pErr) throw pErr;

    const { data: addresses, error: aErr } = await this.admin
      .from("tenant_addresses")
      .select("*")
      .eq("tenant_id", tenantId);

    if (aErr) throw aErr;

    const fiscal = (addresses ?? []).find((a: any) => a.address_type === "FISCAL") ?? null;
    const production = (addresses ?? []).find((a: any) => a.address_type === "PRODUCTION") ?? null;

    return { profile, addresses: { fiscal, production } };
  }

  private async upsertAddress(tenantId: string, addressType: "FISCAL" | "PRODUCTION", input: AddressRow) {
    const { data, error } = await this.admin
      .from("tenant_addresses")
      .upsert(
        {
          tenant_id: tenantId,
          address_type: addressType,
          zip_code: input.zip_code ?? null,
          street: input.street ?? null,
          number: input.number ?? null,
          district: input.district ?? null,
          city: input.city ?? null,
          state: input.state ?? null,
          complement: input.complement ?? null,
        },
        { onConflict: "tenant_id,address_type" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  async upsert(tenantId: string, input: TenantProfileUpsertInput) {
    const fiscal = input.address_fiscal as AddressRow;
    const production: AddressRow =
      input.production_same_as_fiscal ? fiscal : ((input.address_production ?? {}) as AddressRow);

    const { data: profile, error: pErr } = await this.admin
      .from("tenant_profiles")
      .upsert(
        {
          tenant_id: tenantId,
          person_type: input.person_type,
          document: input.document,

          legal_name: input.legal_name ?? null,
          trade_name: input.trade_name ?? null,
          state_registration: input.state_registration ?? null,

          responsible_name: input.responsible_name ?? null,
          responsible_document: input.responsible_document ?? null,

          email: input.email ?? null,
          phone: input.phone ?? null,
          marketing_opt_in: input.marketing_opt_in ?? false,
        },
        { onConflict: "tenant_id" }
      )
      .select("*")
      .single();

    if (pErr) throw pErr;

    const fiscalRow = await this.upsertAddress(tenantId, "FISCAL", fiscal);
    const productionRow = await this.upsertAddress(tenantId, "PRODUCTION", production);

    return {
      profile,
      addresses: { fiscal: fiscalRow, production: productionRow },
    };
  }

  private inferExt(mime: string) {
    if (mime === "image/png") return "png";
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/webp") return "webp";
    if (mime === "image/svg+xml") return "svg";
    return null;
  }

  async uploadLogo(tenantId: string, file: { buffer: Buffer; mimeType: string }) {
    const ext = this.inferExt(file.mimeType);
    if (!ext) {
      const err: any = new Error("Formato de logo inválido. Use PNG, JPG, WEBP ou SVG.");
      err.statusCode = 400;
      throw err;
    }

    // Path fixo (substitui logo)
    const path = `tenant/${tenantId}/logo.${ext}`;

    // upload (como service role, passa direto)
    const { error: upErr } = await this.admin.storage.from(BUCKET).upload(path, file.buffer, {
      upsert: true,
      contentType: file.mimeType,
      cacheControl: "3600",
    });

    if (upErr) throw upErr;

    // bucket público: gera URL pública
    const { data } = this.admin.storage.from(BUCKET).getPublicUrl(path);
    const logo_url = data.publicUrl;

    // salva no profile (cria se não existir)
    const { data: profile, error: pErr } = await this.admin
      .from("tenant_profiles")
      .upsert(
        {
          tenant_id: tenantId,
          person_type: "PJ", // placeholder; será sobrescrito quando fizer PUT /tenant-profile
          document: "PENDING",
          logo_path: path,
          logo_url,
        },
        { onConflict: "tenant_id" }
      )
      .select("*")
      .single();

    // Se falhar por constraint de document (PENDING), fazemos update apenas se já existir profile:
    // (caso você sempre crie profile primeiro via PUT, não precisa disso)
    if (pErr) {
      // tenta update em vez de upsert
      const { data: updated, error: uErr } = await this.admin
        .from("tenant_profiles")
        .update({ logo_path: path, logo_url })
        .eq("tenant_id", tenantId)
        .select("*")
        .maybeSingle();

      if (uErr) throw uErr;
      return { logo_path: path, logo_url, profile: updated };
    }

    return { logo_path: path, logo_url, profile };
  }

  async deleteLogo(tenantId: string) {
    const { data: profile, error: pErr } = await this.admin
      .from("tenant_profiles")
      .select("logo_path")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (pErr) throw pErr;

    const logo_path = (profile as any)?.logo_path as string | null;

    if (logo_path) {
      const { error: delErr } = await this.admin.storage.from(BUCKET).remove([logo_path]);
      if (delErr) throw delErr;
    }

    const { data: updated, error: uErr } = await this.admin
      .from("tenant_profiles")
      .update({ logo_path: null, logo_url: null })
      .eq("tenant_id", tenantId)
      .select("*")
      .maybeSingle();

    if (uErr) throw uErr;

    return { ok: true, profile: updated };
  }
}
