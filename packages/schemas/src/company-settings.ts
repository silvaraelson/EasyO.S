import { z } from "zod";

export const companySettingsSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  document: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().email().nullish(),
  logoDataUrl: z.string().nullish(),
  signatureDataUrl: z.string().nullish(),
  updatedAt: z.coerce.date(),
});
export type CompanySettings = z.infer<typeof companySettingsSchema>;

export const updateCompanySettingsInputSchema = companySettingsSchema.omit({
  id: true,
  updatedAt: true,
});
export type UpdateCompanySettingsInput = z.infer<
  typeof updateCompanySettingsInputSchema
>;
