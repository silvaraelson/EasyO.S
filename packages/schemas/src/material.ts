import { z } from "zod";

export const materialSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().min(1),
  description: z.string().min(1),
  unit: z.string().min(1), // ex.: "un", "m", "cx"
  cost: z.number().nonnegative(), // custo unitário, em centavos
  stockQuantity: z.number().int().default(0),
  lowStockThreshold: z.number().int().nonnegative().optional(),
});
export type Material = z.infer<typeof materialSchema>;

export const createMaterialInputSchema = materialSchema.omit({ id: true });
export type CreateMaterialInput = z.infer<typeof createMaterialInputSchema>;

export const restockMaterialInputSchema = z.object({
  quantity: z.number().int().positive(),
});
export type RestockMaterialInput = z.infer<typeof restockMaterialInputSchema>;

export const updateMaterialInputSchema = z.object({
  description: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  cost: z.number().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().nullable().optional(),
});
export type UpdateMaterialInput = z.infer<typeof updateMaterialInputSchema>;

export const serviceOrderMaterialSchema = z.object({
  id: z.string().uuid(),
  serviceOrderId: z.string().uuid(),
  materialId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(), // em centavos, no momento do uso
});
export type ServiceOrderMaterial = z.infer<typeof serviceOrderMaterialSchema>;

export const addServiceOrderMaterialInputSchema = z.object({
  materialId: z.string().uuid(),
  quantity: z.number().int().positive(),
});
export type AddServiceOrderMaterialInput = z.infer<
  typeof addServiceOrderMaterialInputSchema
>;
