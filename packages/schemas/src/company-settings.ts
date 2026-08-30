import { z } from "zod";

export const companySettingsSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  logoDataUrl: z.string().optional(),
  signatureDataUrl: z.string().optional(),
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
