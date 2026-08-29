import { z } from "zod";

export const userRoleSchema = z.enum([
  "admin",
  "manager",
  "attendant",
  "technician",
]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const customerKindSchema = z.enum(["individual", "company"]);
export type CustomerKind = z.infer<typeof customerKindSchema>;

export const priority = z.enum(["critical", "high", "medium", "low"]);
export type Priority = z.infer<typeof priority>;

/** SLA alvo por prioridade, em horas. */
export const SLA_HOURS_BY_PRIORITY: Record<Priority, number> = {
  critical: 4,
  high: 24,
  medium: 48,
  low: 120,
};

export const serviceOrderStatusSchema = z.enum([
  "draft",
  "open",
  "scheduled",
  "in_progress",
  "paused",
  "completed",
  "invoiced",
  "canceled",
]);
export type ServiceOrderStatus = z.infer<typeof serviceOrderStatusSchema>;

export const paymentMethodSchema = z.enum([
  "cash",
  "pix",
  "credit_card",
  "debit_card",
  "bank_slip",
  "invoice_on_file",
]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const syncStatusSchema = z.enum(["pending", "synced", "conflict"]);
export type SyncStatus = z.infer<typeof syncStatusSchema>;
