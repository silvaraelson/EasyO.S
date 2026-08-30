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

export const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

/** Mapa itemId (do checklist do tipo de serviço) → concluído. */
export const checklistResultsSchema = z.record(z.string(), z.boolean());
export type ChecklistResults = z.infer<typeof checklistResultsSchema>;

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
  checkInLatitude: z.number().min(-90).max(90).optional(),
  checkInLongitude: z.number().min(-180).max(180).optional(),
  checkOutAt: z.coerce.date().optional(),
  checkOutLatitude: z.number().min(-90).max(90).optional(),
  checkOutLongitude: z.number().min(-180).max(180).optional(),
  checklistResults: checklistResultsSchema.default({}),
  description: z.string().optional(),
  technicalReport: z.string().optional(),
  reminderSentAt: z.coerce.date().optional(),
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ServiceOrder = z.infer<typeof serviceOrderSchema>;

export const createServiceOrderInputSchema = serviceOrderSchema.omit({
  id: true,
  number: true,
  status: true,
  checkInAt: true,
  checkInLatitude: true,
  checkInLongitude: true,
  checkOutAt: true,
  checkOutLatitude: true,
  checkOutLongitude: true,
  checklistResults: true,
  technicalReport: true,
  reminderSentAt: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateServiceOrderInput = z.infer<
  typeof createServiceOrderInputSchema
>;

export const updateTechnicalReportInputSchema = z.object({
  technicalReport: z.string().min(1),
});
export type UpdateTechnicalReportInput = z.infer<
  typeof updateTechnicalReportInputSchema
>;

export const updateServiceOrderStatusInputSchema = z.object({
  serviceOrderId: z.string().uuid(),
  status: serviceOrderStatusSchema,
  note: z.string().optional(),
});
export type UpdateServiceOrderStatusInput = z.infer<
  typeof updateServiceOrderStatusInputSchema
>;

export const checkInInputSchema = z.object({
  location: geoPointSchema.optional(),
});
export type CheckInInput = z.infer<typeof checkInInputSchema>;

export const checkOutInputSchema = z.object({
  location: geoPointSchema.optional(),
});
export type CheckOutInput = z.infer<typeof checkOutInputSchema>;

export const updateChecklistInputSchema = z.object({
  checklistResults: checklistResultsSchema,
});
export type UpdateChecklistInput = z.infer<typeof updateChecklistInputSchema>;

export const createAttachmentInputSchema = z.object({
  kind: z.enum(["photo", "signature", "document"]),
  dataUrl: z.string().min(1),
});
export type CreateAttachmentInput = z.infer<typeof createAttachmentInputSchema>;
