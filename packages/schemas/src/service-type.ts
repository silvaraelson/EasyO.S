import { z } from "zod";
import { priority } from "./enums.js";

export const checklistItemSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
  required: z.boolean().default(true),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const serviceTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1), // ex.: "Instalação", "Manutenção", "Reparo"
  defaultPriority: priority,
  checklist: z.array(checklistItemSchema).default([]),
});
export type ServiceType = z.infer<typeof serviceTypeSchema>;

export const createServiceTypeInputSchema = serviceTypeSchema.omit({
  id: true,
});
export type CreateServiceTypeInput = z.infer<
  typeof createServiceTypeInputSchema
>;
