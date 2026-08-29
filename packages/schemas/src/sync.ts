import { z } from "zod";
import { checklistResultsSchema, geoPointSchema, serviceOrderSchema } from "./service-order.js";
import { serviceOrderStatusSchema } from "./enums.js";

export const syncPullQuerySchema = z.object({
  lastPulledAt: z.coerce.number().int().nonnegative().optional(),
});
export type SyncPullQuery = z.infer<typeof syncPullQuerySchema>;

export interface SyncPullResponse {
  serviceOrders: {
    created: z.infer<typeof serviceOrderSchema>[];
    updated: z.infer<typeof serviceOrderSchema>[];
    deletedIds: string[];
  };
  serverTimestamp: number;
}

/**
 * Só os campos que a execução em campo pode alterar via sync — criação e
 * dados administrativos da OS continuam exclusivos do painel web.
 */
export const syncPushServiceOrderSchema = z.object({
  id: z.string().uuid(),
  status: serviceOrderStatusSchema.optional(),
  checkInAt: z.coerce.date().optional(),
  checkInLocation: geoPointSchema.optional(),
  checkOutAt: z.coerce.date().optional(),
  checkOutLocation: geoPointSchema.optional(),
  checklistResults: checklistResultsSchema.optional(),
});
export type SyncPushServiceOrder = z.infer<typeof syncPushServiceOrderSchema>;

export const syncPushInputSchema = z.object({
  lastPulledAt: z.number().int().nonnegative(),
  serviceOrders: z.object({
    updated: z.array(syncPushServiceOrderSchema),
  }),
});
export type SyncPushInput = z.infer<typeof syncPushInputSchema>;

export interface SyncPushResponse {
  serverTimestamp: number;
}
