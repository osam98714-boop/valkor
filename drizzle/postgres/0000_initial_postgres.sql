CREATE TYPE "public"."admin_role" AS ENUM('super_admin', 'product_manager', 'order_manager', 'content_manager', 'custom');--> statement-breakpoint
CREATE TYPE "public"."community_kind" AS ENUM('group', 'channel');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('new', 'pending_payment', 'paid', 'in_progress', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('available', 'unavailable', 'sold_out', 'maintenance', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(80) NOT NULL,
	"displayName" varchar(120) NOT NULL,
	"passwordHash" varchar(512) NOT NULL,
	"role" "admin_role" DEFAULT 'custom' NOT NULL,
	"permissions" jsonb,
	"isRoot" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"lastLoginAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"adminId" integer,
	"adminUsername" varchar(80) NOT NULL,
	"action" varchar(80) NOT NULL,
	"entity" varchar(80) NOT NULL,
	"entityId" varchar(80),
	"details" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"nameAr" varchar(160) NOT NULL,
	"nameEn" varchar(160) NOT NULL,
	"navLabelAr" varchar(160),
	"navLabelEn" varchar(160),
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "community_kind" NOT NULL,
	"nameAr" varchar(200) NOT NULL,
	"nameEn" varchar(200) NOT NULL,
	"imageUrl" varchar(1024),
	"descriptionAr" text,
	"descriptionEn" text,
	"deliveryInfo" text,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currencyCode" varchar(16),
	"available" boolean DEFAULT true NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(16) NOT NULL,
	"name" varchar(100) NOT NULL,
	"symbol" varchar(24) NOT NULL,
	"displayFormat" varchar(80) NOT NULL,
	"exchangeRate" numeric(18, 6) DEFAULT '1' NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"telegramId" varchar(100),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"productId" integer,
	"skuSnapshot" varchar(80) NOT NULL,
	"nameSnapshot" varchar(200) NOT NULL,
	"specificationsSnapshot" text,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(12, 2) NOT NULL,
	"currencyCode" varchar(16) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderNo" varchar(32) NOT NULL,
	"customerId" integer NOT NULL,
	"status" "order_status" DEFAULT 'new' NOT NULL,
	"currencyCode" varchar(16) NOT NULL,
	"currencyName" varchar(100) NOT NULL,
	"currencySymbol" varchar(24) NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"paymentNote" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_orderNo_unique" UNIQUE("orderNo")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" varchar(80) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"nameAr" varchar(200) NOT NULL,
	"nameEn" varchar(200) NOT NULL,
	"categoryId" integer,
	"imageUrl" varchar(1024),
	"extraImages" jsonb,
	"shortDescriptionAr" text,
	"shortDescriptionEn" text,
	"descriptionAr" text,
	"descriptionEn" text,
	"specifications" text,
	"features" text,
	"usageInstructions" text,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currencyCode" varchar(16),
	"status" "product_status" DEFAULT 'hidden' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"trackInventory" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"orderCount" integer DEFAULT 0 NOT NULL,
	"createdBy" integer,
	"updatedBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(120) NOT NULL,
	"url" varchar(1024) NOT NULL,
	"platform" varchar(40) NOT NULL,
	"location" varchar(40) DEFAULT 'footer' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"settingKey" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"updatedBy" integer,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_settings_settingKey_unique" UNIQUE("settingKey")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminId_admins_id_fk" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_listings" ADD CONSTRAINT "community_listings_createdBy_admins_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_createdBy_admins_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_updatedBy_admins_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_updatedBy_admins_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;