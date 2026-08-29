import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "attendant",
  "technician",
]);

export const customerKindEnum = pgEnum("customer_kind", [
  "individual",
  "company",
]);

export const priorityEnum = pgEnum("priority", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const serviceOrderStatusEnum = pgEnum("service_order_status", [
  "draft",
  "open",
  "scheduled",
  "in_progress",
  "paused",
  "completed",
  "invoiced",
  "canceled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "pix",
  "credit_card",
  "debit_card",
  "bank_slip",
  "invoice_on_file",
]);

export const attachmentKindEnum = pgEnum("attachment_kind", [
  "photo",
  "signature",
  "document",
]);

// ---------------------------------------------------------------------------
// Auth (shape expected by the Better Auth Drizzle adapter — regenerate with
// `npx @better-auth/cli generate` if the auth config below changes).
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("attendant"),
  team: text("team"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),
  issuer: text("issuer"),
  accountId: text("account_id").notNull(),
  password: text("password"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: customerKindEnum("kind").notNull(),
  name: text("name").notNull(),
  document: text("document").notNull().unique(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  street: text("street").notNull(),
  number: text("number").notNull(),
  complement: text("complement"),
  district: text("district").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  latitude: numeric("latitude", { precision: 9, scale: 6, mode: "number" }),
  longitude: numeric("longitude", { precision: 9, scale: 6, mode: "number" }),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  isPrimary: boolean("is_primary").notNull().default(false),
});

// ---------------------------------------------------------------------------
// Tipos de serviço (configurável, mantém o sistema genérico entre segmentos)
// ---------------------------------------------------------------------------

export const serviceTypes = pgTable("service_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  defaultPriority: priorityEnum("default_priority").notNull(),
  checklist: jsonb("checklist").notNull().default([]),
});

// ---------------------------------------------------------------------------
// Ordens de serviço
// ---------------------------------------------------------------------------

export const serviceOrders = pgTable("service_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: integer("number").notNull().unique().generatedAlwaysAsIdentity(),
  serviceTypeId: uuid("service_type_id")
    .notNull()
    .references(() => serviceTypes.id),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  addressId: uuid("address_id")
    .notNull()
    .references(() => addresses.id),
  assignedTechnicianId: uuid("assigned_technician_id").references(
    () => user.id,
  ),
  priority: priorityEnum("priority").notNull(),
  status: serviceOrderStatusEnum("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  checkInAt: timestamp("check_in_at"),
  checkOutAt: timestamp("check_out_at"),
  description: text("description"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const serviceOrderEvents = pgTable("service_order_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id")
    .notNull()
    .references(() => serviceOrders.id, { onDelete: "cascade" }),
  status: serviceOrderStatusEnum("status").notNull(),
  note: text("note"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const serviceOrderAttachments = pgTable("service_order_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id")
    .notNull()
    .references(() => serviceOrders.id, { onDelete: "cascade" }),
  kind: attachmentKindEnum("kind").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Materiais / estoque
// ---------------------------------------------------------------------------

export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  sku: text("sku").notNull().unique(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  cost: integer("cost").notNull(), // em centavos
  stockQuantity: integer("stock_quantity").notNull().default(0),
});

export const serviceOrderMaterials = pgTable("service_order_materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id")
    .notNull()
    .references(() => serviceOrders.id, { onDelete: "cascade" }),
  materialId: uuid("material_id")
    .notNull()
    .references(() => materials.id),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(), // em centavos, no momento do uso
});

// ---------------------------------------------------------------------------
// Financeiro: orçamento e fatura
// ---------------------------------------------------------------------------

export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id")
    .notNull()
    .references(() => serviceOrders.id, { onDelete: "cascade" }),
  approvedByCustomerAt: timestamp("approved_by_customer_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const budgetItems = pgTable("budget_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id")
    .notNull()
    .references(() => budgets.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: integer("unit_price").notNull(), // em centavos
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id")
    .notNull()
    .references(() => serviceOrders.id, { onDelete: "cascade" }),
  totalAmount: integer("total_amount").notNull(), // em centavos
  paymentMethod: paymentMethodEnum("payment_method"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
