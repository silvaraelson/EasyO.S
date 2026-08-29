import { z } from "zod";
import { paymentMethodSchema } from "./enums.js";

export const budgetItemSchema = z.object({
  id: z.string().uuid(),
  budgetId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(), // em centavos
});
export type BudgetItem = z.infer<typeof budgetItemSchema>;

export const budgetSchema = z.object({
  id: z.string().uuid(),
  serviceOrderId: z.string().uuid(),
  approvedByCustomerAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
});
export type Budget = z.infer<typeof budgetSchema>;

export const invoiceSchema = z.object({
  id: z.string().uuid(),
  serviceOrderId: z.string().uuid(),
  totalAmount: z.number().nonnegative(), // em centavos
  paymentMethod: paymentMethodSchema.optional(),
  paidAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
});
export type Invoice = z.infer<typeof invoiceSchema>;
