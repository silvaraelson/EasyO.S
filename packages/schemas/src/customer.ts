import { z } from "zod";
import { customerKindSchema } from "./enums.js";

export const addressSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  label: z.string().min(1).max(80), // ex.: "Matriz", "Casa", "Filial Centro"
  street: z.string().min(1),
  number: z.string().min(1),
  complement: z.string().optional(),
  district: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zipCode: z.string().min(8).max(9),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type Address = z.infer<typeof addressSchema>;

export const contactSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  isPrimary: z.boolean().default(false),
});
export type Contact = z.infer<typeof contactSchema>;

export const customerSchema = z.object({
  id: z.string().uuid(),
  kind: customerKindSchema,
  name: z.string().min(1), // razão social ou nome completo
  document: z.string().min(11).max(18), // CPF ou CNPJ, sem máscara
  notes: z.string().optional(),
  createdAt: z.coerce.date(),
});
export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = customerSchema.omit({
  id: true,
  createdAt: true,
});
export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;
