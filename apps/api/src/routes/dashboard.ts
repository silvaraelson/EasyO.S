import type { FastifyPluginAsync } from "fastify";
import { and, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { SLA_HOURS_BY_PRIORITY } from "@easy-os/schemas";
import { db } from "../db/client.js";
import {
  invoices,
  materials,
  serviceOrderEvents,
  serviceOrders,
  serviceTypes,
  user,
} from "../db/schema.js";
import { requireAuth } from "../lib/guards.js";

const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const COMPLETED_STATUSES = ["completed", "invoiced"] as const;

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/dashboard/summary", { preHandler: requireAuth }, async (request) => {
    const { from, to } = querySchema.parse(request.query);
    const rangeStart = from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rangeEnd = to ?? new Date();

    const orders = await db
      .select({
        id: serviceOrders.id,
        status: serviceOrders.status,
        priority: serviceOrders.priority,
        serviceTypeId: serviceOrders.serviceTypeId,
        serviceTypeName: serviceTypes.name,
        assignedTechnicianId: serviceOrders.assignedTechnicianId,
        technicianName: user.name,
        createdAt: serviceOrders.createdAt,
        checkOutAt: serviceOrders.checkOutAt,
      })
      .from(serviceOrders)
      .leftJoin(serviceTypes, eq(serviceOrders.serviceTypeId, serviceTypes.id))
      .leftJoin(user, eq(serviceOrders.assignedTechnicianId, user.id))
      .where(and(gte(serviceOrders.createdAt, rangeStart), lte(serviceOrders.createdAt, rangeEnd)));

    const orderIds = orders.map((order) => order.id);

    const [pausedEvents, orderInvoices] = await Promise.all([
      orderIds.length
        ? db
            .select({ serviceOrderId: serviceOrderEvents.serviceOrderId })
            .from(serviceOrderEvents)
            .where(
              and(
                inArray(serviceOrderEvents.serviceOrderId, orderIds),
                eq(serviceOrderEvents.status, "paused"),
              ),
            )
        : Promise.resolve([]),
      orderIds.length
        ? db.select().from(invoices).where(inArray(invoices.serviceOrderId, orderIds))
        : Promise.resolve([]),
    ]);

    const pausedOrderIds = new Set(pausedEvents.map((event) => event.serviceOrderId));

    // OS por status / por tipo
    const ordersByStatus: Record<string, number> = {};
    const byServiceType = new Map<string, { serviceTypeId: string; name: string; count: number }>();
    const byTechnician = new Map<string, { technicianId: string; name: string; completedCount: number }>();

    for (const order of orders) {
      ordersByStatus[order.status] = (ordersByStatus[order.status] ?? 0) + 1;

      const typeKey = order.serviceTypeId;
      const typeEntry = byServiceType.get(typeKey) ?? {
        serviceTypeId: typeKey,
        name: order.serviceTypeName ?? "—",
        count: 0,
      };
      typeEntry.count += 1;
      byServiceType.set(typeKey, typeEntry);
    }

    // SLA cumprido + tempo médio de atendimento + first-time fix rate
    let slaMet = 0;
    let slaTotal = 0;
    let resolutionHoursSum = 0;
    let resolutionCount = 0;
    let fixedFirstTry = 0;
    let completedTotal = 0;

    for (const order of orders) {
      if (!COMPLETED_STATUSES.includes(order.status as (typeof COMPLETED_STATUSES)[number])) {
        continue;
      }
      if (!order.checkOutAt) continue;

      completedTotal += 1;
      if (!pausedOrderIds.has(order.id)) fixedFirstTry += 1;

      const hours = (order.checkOutAt.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60);
      resolutionHoursSum += hours;
      resolutionCount += 1;

      slaTotal += 1;
      if (hours <= SLA_HOURS_BY_PRIORITY[order.priority]) slaMet += 1;

      if (order.assignedTechnicianId) {
        const techEntry = byTechnician.get(order.assignedTechnicianId) ?? {
          technicianId: order.assignedTechnicianId,
          name: order.technicianName ?? "—",
          completedCount: 0,
        };
        techEntry.completedCount += 1;
        byTechnician.set(order.assignedTechnicianId, techEntry);
      }
    }

    const totalRevenue = orderInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
    const ticketMedio = orderInvoices.length > 0 ? totalRevenue / orderInvoices.length : 0;

    const lowStockMaterials = await db
      .select({
        id: materials.id,
        sku: materials.sku,
        description: materials.description,
        stockQuantity: materials.stockQuantity,
        lowStockThreshold: materials.lowStockThreshold,
      })
      .from(materials)
      .where(
        and(
          isNotNull(materials.lowStockThreshold),
          sql`${materials.stockQuantity} <= ${materials.lowStockThreshold}`,
        ),
      );

    return {
      range: { from: rangeStart.toISOString(), to: rangeEnd.toISOString() },
      totalOrders: orders.length,
      ordersByStatus,
      ordersByServiceType: Array.from(byServiceType.values()).sort((a, b) => b.count - a.count),
      ordersByTechnician: Array.from(byTechnician.values()).sort(
        (a, b) => b.completedCount - a.completedCount,
      ),
      slaCompliance: {
        met: slaMet,
        total: slaTotal,
        rate: slaTotal > 0 ? slaMet / slaTotal : null,
      },
      avgResolutionHours: resolutionCount > 0 ? resolutionHoursSum / resolutionCount : null,
      firstTimeFixRate: completedTotal > 0 ? fixedFirstTry / completedTotal : null,
      ticketMedio,
      totalRevenue,
      invoiceCount: orderInvoices.length,
      lowStockMaterials,
    };
  });
};
