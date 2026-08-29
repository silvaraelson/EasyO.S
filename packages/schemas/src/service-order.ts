import { z } from "zod";
import { priority, serviceOrderStatusSchema } from "./enums.js";

export const serviceOrderEventSchema = z.object({
  id: z.string().uuid(),
  serviceOrderId: z.string().uuid(),
  status: serviceOrderStatusSchema,
  note: z.string().optional(),
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date(),
});
export type ServiceOrderEvent = z.infer<typeof serviceOrderEventSchema>;

export const serviceOrderAttachmentSchema = z.object({
  id: z.string().uuid(),
  serviceOrderId: z.string().uuid(),
  kind: z.enum(["photo", "signature", "document"]),
  url: z.string().url(),
  createdAt: z.coerce.date(),
});
export type ServiceOrderAttachment = z.infer<
  typeof serviceOrderAttachmentSchema
>;

export const serviceOrderSchema = z.object({
  id: z.string().uuid(),
  number: z.number().int().positive(), // sequencial, exibido ao usuário
  serviceTypeId: z.string().uuid(),
  customerId: z.string().uuid(),
  addressId: z.string().uuid(),
  assignedTechnicianId: z.string().uuid().optional(),
  priority,
  status: serviceOrderStatusSchema,
  scheduledAt: z.coerce.date().optional(),
  checkInAt: z.coerce.date().optional(),
  checkOutAt: z.coerce.date().optional(),
  description: z.string().optional(),
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date(),
});
export type ServiceOrder = z.infer<typeof serviceOrderSchema>;

export const createServiceOrderInputSchema = serviceOrderSchema.omit({
  id: true,
  number: true,
  status: true,
  checkInAt: true,
  checkOutAt: true,
  createdAt: true,
});
export type CreateServiceOrderInput = z.infer<
  typeof createServiceOrderInputSchema
>;

export const updateServiceOrderStatusInputSchema = z.object({
  serviceOrderId: z.string().uuid(),
  status: serviceOrderStatusSchema,
  note: z.string().optional(),
});
export type UpdateServiceOrderStatusInput = z.infer<
  typeof updateServiceOrderStatusInputSchema
>;
