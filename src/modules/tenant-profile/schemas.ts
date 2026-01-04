import { z } from "zod";

export const personTypeEnum = z.enum(["PJ", "PF"]);

export const tenantAddressSchema = z.object({
  zip_code: z.string().min(3).optional().nullable(),
  street: z.string().min(1).optional().nullable(),
  number: z.string().min(1).optional().nullable(),
  district: z.string().min(1).optional().nullable(),
  city: z.string().min(1).optional().nullable(),
  state: z.string().min(1).optional().nullable(),
  complement: z.string().min(1).optional().nullable(),
});

export const tenantProfileUpsertSchema = z
  .object({
    person_type: personTypeEnum,
    document: z.string().min(5),

    // PJ
    legal_name: z.string().min(2).optional().nullable(),
    trade_name: z.string().min(2).optional().nullable(),
    state_registration: z.string().min(1).optional().nullable(),

    // Responsável
    responsible_name: z.string().min(2).optional().nullable(),
    responsible_document: z.string().min(5).optional().nullable(),

    // Contato
    email: z.string().email().optional().nullable(),
    phone: z.string().min(5).optional().nullable(),
    marketing_opt_in: z.boolean().optional(),

    // Endereços
    production_same_as_fiscal: z.boolean().default(false),
    address_fiscal: tenantAddressSchema,
    address_production: tenantAddressSchema.optional(), // opcional se "same_as"
  })
  .superRefine((val, ctx) => {
    if (val.person_type === "PJ") {
      if (!val.legal_name || val.legal_name.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["legal_name"],
          message: "PJ exige legal_name (razão social).",
        });
      }
      if (!val.trade_name || val.trade_name.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["trade_name"],
          message: "PJ exige trade_name (nome fantasia).",
        });
      }
    }

    if (val.person_type === "PF") {
      if (!val.responsible_name || val.responsible_name.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["responsible_name"],
          message: "PF exige responsible_name (nome do responsável).",
        });
      }
      // CPF do responsável pode ser o mesmo do document, então não obrigo.
    }

    if (!val.production_same_as_fiscal && !val.address_production) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["address_production"],
        message: "Informe address_production ou marque production_same_as_fiscal = true.",
      });
    }
  });

export type TenantProfileUpsertInput = z.infer<typeof tenantProfileUpsertSchema>;
