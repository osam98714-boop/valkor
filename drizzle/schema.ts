import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/** Platform OAuth users are retained for compatibility; Valkor admins use their own accounts. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const admins = mysqlTable("admins", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 80 }).notNull().unique(),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 512 }).notNull(),
  role: mysqlEnum("role", ["super_admin", "product_manager", "order_manager", "content_manager", "custom"]).default("custom").notNull(),
  permissions: json("permissions").$type<string[]>(),
  isRoot: boolean("isRoot").default(false).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  nameAr: varchar("nameAr", { length: 160 }).notNull(),
  nameEn: varchar("nameEn", { length: 160 }).notNull(),
  navLabelAr: varchar("navLabelAr", { length: 160 }),
  navLabelEn: varchar("navLabelEn", { length: 160 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  visible: boolean("visible").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const currencies = mysqlTable("currencies", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 24 }).notNull(),
  displayFormat: varchar("displayFormat", { length: 80 }).notNull(),
  exchangeRate: decimal("exchangeRate", { precision: 18, scale: 6 }).default("1").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  sku: varchar("sku", { length: 80 }).notNull().unique(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  nameAr: varchar("nameAr", { length: 200 }).notNull(),
  nameEn: varchar("nameEn", { length: 200 }).notNull(),
  categoryId: int("categoryId").references(() => categories.id, { onDelete: "set null" }),
  imageUrl: varchar("imageUrl", { length: 1024 }),
  extraImages: json("extraImages").$type<string[]>(),
  shortDescriptionAr: text("shortDescriptionAr"),
  shortDescriptionEn: text("shortDescriptionEn"),
  descriptionAr: text("descriptionAr"),
  descriptionEn: text("descriptionEn"),
  specifications: text("specifications"),
  features: text("features"),
  usageInstructions: text("usageInstructions"),
  price: decimal("price", { precision: 12, scale: 2 }).default("0").notNull(),
  currencyCode: varchar("currencyCode", { length: 16 }),
  status: mysqlEnum("status", ["available", "unavailable", "sold_out", "maintenance", "hidden"]).default("hidden").notNull(),
  quantity: int("quantity").default(0).notNull(),
  trackInventory: boolean("trackInventory").default(false).notNull(),
  featured: boolean("featured").default(false).notNull(),
  published: boolean("published").default(false).notNull(),
  orderCount: int("orderCount").default(0).notNull(),
  createdBy: int("createdBy").references(() => admins.id, { onDelete: "set null" }),
  updatedBy: int("updatedBy").references(() => admins.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  telegramId: varchar("telegramId", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNo: varchar("orderNo", { length: 32 }).notNull().unique(),
  customerId: int("customerId").notNull().references(() => customers.id, { onDelete: "restrict" }),
  status: mysqlEnum("status", ["new", "pending_payment", "paid", "in_progress", "delivered", "cancelled"]).default("new").notNull(),
  currencyCode: varchar("currencyCode", { length: 16 }).notNull(),
  currencyName: varchar("currencyName", { length: 100 }).notNull(),
  currencySymbol: varchar("currencySymbol", { length: 24 }).notNull(),
  subtotal: decimal("subtotal", { precision: 14, scale: 2 }).notNull(),
  total: decimal("total", { precision: 14, scale: 2 }).notNull(),
  paymentNote: text("paymentNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: int("productId").references(() => products.id, { onDelete: "set null" }),
  skuSnapshot: varchar("skuSnapshot", { length: 80 }).notNull(),
  nameSnapshot: varchar("nameSnapshot", { length: 200 }).notNull(),
  specificationsSnapshot: text("specificationsSnapshot"),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  currencyCode: varchar("currencyCode", { length: 16 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const communityListings = mysqlTable("community_listings", {
  id: int("id").autoincrement().primaryKey(),
  kind: mysqlEnum("kind", ["group", "channel"]).notNull(),
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
  createdBy: int("createdBy").references(() => admins.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const socialLinks = mysqlTable("social_links", {
  id: int("id").autoincrement().primaryKey(),
  label: varchar("label", { length: 120 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  platform: varchar("platform", { length: 40 }).notNull(),
  location: varchar("location", { length: 40 }).default("footer").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  visible: boolean("visible").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const storeSettings = mysqlTable("store_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedBy: int("updatedBy").references(() => admins.id, { onDelete: "set null" }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").references(() => admins.id, { onDelete: "set null" }),
  adminUsername: varchar("adminUsername", { length: 80 }).notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 80 }),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type AdminAccount = typeof admins.$inferSelect;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Currency = typeof currencies.$inferSelect;
export type Order = typeof orders.$inferSelect;
