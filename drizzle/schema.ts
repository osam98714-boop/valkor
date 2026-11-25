import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const adminRole = pgEnum("admin_role", ["super_admin", "product_manager", "order_manager", "content_manager", "custom"]);
export const productStatus = pgEnum("product_status", ["available", "unavailable", "sold_out", "maintenance", "hidden"]);
export const orderStatus = pgEnum("order_status", ["new", "pending_payment", "paid", "in_progress", "delivered", "cancelled"]);
export const communityKind = pgEnum("community_kind", ["group", "channel"]);

const createdAt = () => timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull();
const updatedAt = () => timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date());

/** Platform OAuth users are retained for compatibility; Valkor admins use their own accounts. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 80 }).notNull().unique(),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 512 }).notNull(),
  role: adminRole("role").default("custom").notNull(),
  permissions: jsonb("permissions").$type<string[]>(),
  isRoot: boolean("isRoot").default(false).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastLoginAt: timestamp("lastLoginAt", { withTimezone: true, mode: "date" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  nameAr: varchar("nameAr", { length: 160 }).notNull(),
  nameEn: varchar("nameEn", { length: 160 }).notNull(),
  navLabelAr: varchar("navLabelAr", { length: 160 }),
  navLabelEn: varchar("navLabelEn", { length: 160 }),
  sortOrder: integer("sortOrder").default(0).notNull(),
  visible: boolean("visible").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 24 }).notNull(),
  displayFormat: varchar("displayFormat", { length: 80 }).notNull(),
  exchangeRate: decimal("exchangeRate", { precision: 18, scale: 6 }).default("1").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sku: varchar("sku", { length: 80 }).notNull().unique(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  nameAr: varchar("nameAr", { length: 200 }).notNull(),
  nameEn: varchar("nameEn", { length: 200 }).notNull(),
  categoryId: integer("categoryId").references(() => categories.id, { onDelete: "set null" }),
  imageUrl: varchar("imageUrl", { length: 1024 }),
  extraImages: jsonb("extraImages").$type<string[]>(),
  shortDescriptionAr: text("shortDescriptionAr"),
  shortDescriptionEn: text("shortDescriptionEn"),
  descriptionAr: text("descriptionAr"),
  descriptionEn: text("descriptionEn"),
  specifications: text("specifications"),
  features: text("features"),
  usageInstructions: text("usageInstructions"),
  price: decimal("price", { precision: 12, scale: 2 }).default("0").notNull(),
  currencyCode: varchar("currencyCode", { length: 16 }),
  status: productStatus("status").default("hidden").notNull(),
  quantity: integer("quantity").default(0).notNull(),
  trackInventory: boolean("trackInventory").default(false).notNull(),
  featured: boolean("featured").default(false).notNull(),
  published: boolean("published").default(false).notNull(),
  orderCount: integer("orderCount").default(0).notNull(),
  createdBy: integer("createdBy").references(() => admins.id, { onDelete: "set null" }),
  updatedBy: integer("updatedBy").references(() => admins.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  telegramId: varchar("telegramId", { length: 100 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNo: varchar("orderNo", { length: 32 }).notNull().unique(),
  customerId: integer("customerId").notNull().references(() => customers.id, { onDelete: "restrict" }),
  status: orderStatus("status").default("new").notNull(),
  currencyCode: varchar("currencyCode", { length: 16 }).notNull(),
  currencyName: varchar("currencyName", { length: 100 }).notNull(),
  currencySymbol: varchar("currencySymbol", { length: 24 }).notNull(),
  subtotal: decimal("subtotal", { precision: 14, scale: 2 }).notNull(),
  total: decimal("total", { precision: 14, scale: 2 }).notNull(),
  paymentNote: text("paymentNote"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("productId").references(() => products.id, { onDelete: "set null" }),
  skuSnapshot: varchar("skuSnapshot", { length: 80 }).notNull(),
  nameSnapshot: varchar("nameSnapshot", { length: 200 }).notNull(),
  specificationsSnapshot: text("specificationsSnapshot"),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  currencyCode: varchar("currencyCode", { length: 16 }).notNull(),
  createdAt: createdAt(),
});

export const communityListings = pgTable("community_listings", {
  id: serial("id").primaryKey(),
  kind: communityKind("kind").notNull(),
  nameAr: varchar("nameAr", { length: 200 }).notNull(),
  nameEn: varchar("nameEn", { length: 200 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 1024 }),
  descriptionAr: text("descriptionAr"),
  descriptionEn: text("descriptionEn"),
  deliveryInfo: text("deliveryInfo"),
  price: decimal("price", { precision: 12, scale: 2 }).default("0").notNull(),
  currencyCode: varchar("currencyCode", { length: 16 }),
  available: boolean("available").default(true).notNull(),
  published: boolean("published").default(false).notNull(),
  createdBy: integer("createdBy").references(() => admins.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const socialLinks = pgTable("social_links", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 120 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  platform: varchar("platform", { length: 40 }).notNull(),
  location: varchar("location", { length: 40 }).default("footer").notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  visible: boolean("visible").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const storeSettings = pgTable("store_settings", {
  id: serial("id").primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedBy: integer("updatedBy").references(() => admins.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("adminId").references(() => admins.id, { onDelete: "set null" }),
  adminUsername: varchar("adminUsername", { length: 80 }).notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 80 }),
  details: text("details"),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type AdminAccount = typeof admins.$inferSelect;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Currency = typeof currencies.$inferSelect;
export type Order = typeof orders.$inferSelect;
