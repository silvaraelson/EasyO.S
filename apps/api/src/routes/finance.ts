import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  addServiceOrderMaterialInputSchema,
  createBudgetInputSchema,
  createInvoiceInputSchema,
  payInvoiceInputSchema,
  type PaymentMethod,
} from "@easy-os/schemas";
import { db } from "../db/client.js";
import {
  addresses,
  budgetItems,
  budgets,
  customers,
  invoices,
  materials,
  serviceOrderMaterials,
  serviceOrders,
} from "../db/schema.js";
import { requireAuth, requireRole } from "../lib/guards.js";
import { InvoicePdfDocument } from "../pdf/invoice-document.js";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  bank_slip: "Boleto",
  invoice_on_file: "Faturado (a prazo)",
};

export const financeRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  app.post(
    "/service-orders/:id/materials",
    { preHandler: requireRole("admin", "manager", "attendant") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = addServiceOrderMaterialInputSchema.parse(request.body);

      const [material] = await db.select().from(materials).where(eq(materials.id, input.materialId));
      if (!material) {
        return reply.code(404).send({ message: "Material não encontrado" });
      }
      if (material.stockQuantity < input.quantity) {
        return reply.code(422).send({
          message: `Estoque insuficiente: há ${material.stockQuantity} un. de "${material.description}"`,
        });
      }

      const [usage] = await db
        .insert(serviceOrderMaterials)
        .values({
          serviceOrderId: id,
          materialId: input.materialId,
          quantity: input.quantity,
          unitPrice: material.cost,
        })
        .returning();

      await db
        .update(materials)
        .set({ stockQuantity: material.stockQuantity - input.quantity })
        .where(eq(materials.id, input.materialId));

      return reply.code(201).send(usage);
    },
  );

  app.post(
    "/service-orders/:id/budget",
    { preHandler: requireRole("admin", "manager", "attendant") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = createBudgetInputSchema.parse(request.body);

      const [existing] = await db.select().from(budgets).where(eq(budgets.serviceOrderId, id));
      if (existing) {
        return reply.code(422).send({ message: "Essa OS já tem um orçamento" });
      }

      const [budget] = await db.insert(budgets).values({ serviceOrderId: id }).returning();
      if (!budget) {
        return reply.code(500).send({ message: "Falha ao criar o orçamento" });
      }

      const items = await db
        .insert(budgetItems)
        .values(input.items.map((item) => ({ ...item, budgetId: budget.id })))
        .returning();

      return reply.code(201).send({ ...budget, items });
    },
  );

  app.post(
    "/budgets/:id/approve",
    { preHandler: requireRole("admin", "manager", "attendant") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [budget] = await db
        .update(budgets)
        .set({ approvedByCustomerAt: new Date() })
        .where(eq(budgets.id, id))
        .returning();

      if (!budget) {
        return reply.code(404).send({ message: "Orçamento não encontrado" });
      }
      return budget;
    },
  );

  app.post(
    "/service-orders/:id/invoice",
    { preHandler: requireRole("admin", "manager", "attendant") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = createInvoiceInputSchema.parse(request.body);

      const [existing] = await db.select().from(invoices).where(eq(invoices.serviceOrderId, id));
      if (existing) {
        return reply.code(422).send({ message: "Essa OS já tem uma fatura" });
      }

      const [budget] = await db.select().from(budgets).where(eq(budgets.serviceOrderId, id));
      const [budgetItemRows, materialRows] = await Promise.all([
        budget
          ? db.select().from(budgetItems).where(eq(budgetItems.budgetId, budget.id))
          : Promise.resolve([]),
        db.select().from(serviceOrderMaterials).where(eq(serviceOrderMaterials.serviceOrderId, id)),
      ]);

      const budgetTotal = budgetItemRows.reduce(
        (sum, item) => sum + Number(item.quantity) * item.unitPrice,
        0,
      );
      const materialsTotal = materialRows.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );
      const totalAmount = budgetTotal + materialsTotal;

      const [invoice] = await db
        .insert(invoices)
        .values({ serviceOrderId: id, totalAmount, paymentMethod: input.paymentMethod })
        .returning();

      return reply.code(201).send(invoice);
    },
  );

  app.post(
    "/invoices/:id/pay",
    { preHandler: requireRole("admin", "manager", "attendant") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = payInvoiceInputSchema.parse(request.body);

      const [invoice] = await db
        .update(invoices)
        .set({ paymentMethod: input.paymentMethod, paidAt: new Date() })
        .where(eq(invoices.id, id))
        .returning();

      if (!invoice) {
        return reply.code(404).send({ message: "Fatura não encontrada" });
      }
      return invoice;
    },
  );

  app.get("/invoices/:id/pdf", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) {
      return reply.code(404).send({ message: "Fatura não encontrada" });
    }

    const [serviceOrder] = await db
      .select()
      .from(serviceOrders)
      .where(eq(serviceOrders.id, invoice.serviceOrderId));
    if (!serviceOrder) {
      return reply.code(404).send({ message: "OS da fatura não encontrada" });
    }

    const [customer] = await db.select().from(customers).where(eq(customers.id, serviceOrder.customerId));
    const [address] = await db.select().from(addresses).where(eq(addresses.id, serviceOrder.addressId));

    const [budget] = await db.select().from(budgets).where(eq(budgets.serviceOrderId, serviceOrder.id));
    const [budgetItemRows, materialRows] = await Promise.all([
      budget
        ? db.select().from(budgetItems).where(eq(budgetItems.budgetId, budget.id))
        : Promise.resolve([]),
      db
        .select({
          quantity: serviceOrderMaterials.quantity,
          unitPrice: serviceOrderMaterials.unitPrice,
          description: materials.description,
        })
        .from(serviceOrderMaterials)
        .innerJoin(materials, eq(serviceOrderMaterials.materialId, materials.id))
        .where(eq(serviceOrderMaterials.serviceOrderId, serviceOrder.id)),
    ]);

    const items = [
      ...budgetItemRows.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice,
      })),
      ...materialRows.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    ];

    const buffer = await renderToBuffer(
      InvoicePdfDocument({
        serviceOrderNumber: serviceOrder.number,
        issuedAt: invoice.createdAt,
        paidAt: invoice.paidAt,
        paymentMethodLabel: invoice.paymentMethod
          ? PAYMENT_METHOD_LABELS[invoice.paymentMethod]
          : undefined,
        customerName: customer?.name ?? "Cliente",
        customerDocument: customer?.document ?? "",
        addressLine: address
          ? `${address.street}, ${address.number} — ${address.city}/${address.state}`
          : "",
        items,
        totalAmount: invoice.totalAmount,
      }),
    );

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `inline; filename="fatura-os-${serviceOrder.number}.pdf"`);
    return reply.send(buffer);
  });
};
