CREATE TABLE `admins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(80) NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`passwordHash` varchar(512) NOT NULL,
	`role` enum('super_admin','product_manager','order_manager','content_manager','custom') NOT NULL DEFAULT 'custom',
	`permissions` json,
	`isRoot` boolean NOT NULL DEFAULT false,
	`enabled` boolean NOT NULL DEFAULT true,
	`lastLoginAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `admins_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int,
	`adminUsername` varchar(80) NOT NULL,
	`action` varchar(80) NOT NULL,
	`entity` varchar(80) NOT NULL,
	`entityId` varchar(80),
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`nameAr` varchar(160) NOT NULL,
	`nameEn` varchar(160) NOT NULL,
	`navLabelAr` varchar(160),
	`navLabelEn` varchar(160),
	`sortOrder` int NOT NULL DEFAULT 0,
	`visible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `community_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('group','channel') NOT NULL,
	`nameAr` varchar(200) NOT NULL,
	`nameEn` varchar(200) NOT NULL,
	`imageUrl` varchar(1024),
	`descriptionAr` text,
	`descriptionEn` text,
	`deliveryInfo` text,
	`price` decimal(12,2) NOT NULL DEFAULT '0',
	`currencyCode` varchar(16),
	`available` boolean NOT NULL DEFAULT true,
	`published` boolean NOT NULL DEFAULT false,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `community_listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `currencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`name` varchar(100) NOT NULL,
	`symbol` varchar(24) NOT NULL,
	`displayFormat` varchar(80) NOT NULL,
	`exchangeRate` decimal(18,6) NOT NULL DEFAULT '1',
	`isDefault` boolean NOT NULL DEFAULT false,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `currencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `currencies_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`telegramId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int,
	`skuSnapshot` varchar(80) NOT NULL,
	`nameSnapshot` varchar(200) NOT NULL,
	`specificationsSnapshot` text,
	`quantity` int NOT NULL,
	`unitPrice` decimal(12,2) NOT NULL,
	`currencyCode` varchar(16) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNo` varchar(32) NOT NULL,
	`customerId` int NOT NULL,
	`status` enum('new','pending_payment','paid','in_progress','delivered','cancelled') NOT NULL DEFAULT 'new',
	`currencyCode` varchar(16) NOT NULL,
	`currencyName` varchar(100) NOT NULL,
	`currencySymbol` varchar(24) NOT NULL,
	`subtotal` decimal(14,2) NOT NULL,
	`total` decimal(14,2) NOT NULL,
	`paymentNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNo_unique` UNIQUE(`orderNo`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku` varchar(80) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`nameAr` varchar(200) NOT NULL,
	`nameEn` varchar(200) NOT NULL,
	`categoryId` int,
	`imageUrl` varchar(1024),
	`extraImages` json,
	`shortDescriptionAr` text,
	`shortDescriptionEn` text,
	`descriptionAr` text,
	`descriptionEn` text,
	`specifications` text,
	`features` text,
	`usageInstructions` text,
	`price` decimal(12,2) NOT NULL DEFAULT '0',
	`currencyCode` varchar(16),
	`status` enum('available','unavailable','sold_out','maintenance','hidden') NOT NULL DEFAULT 'hidden',
	`quantity` int NOT NULL DEFAULT 0,
	`trackInventory` boolean NOT NULL DEFAULT false,
	`featured` boolean NOT NULL DEFAULT false,
	`published` boolean NOT NULL DEFAULT false,
	`orderCount` int NOT NULL DEFAULT 0,
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `social_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(120) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`platform` varchar(40) NOT NULL,
	`location` varchar(40) NOT NULL DEFAULT 'footer',
	`sortOrder` int NOT NULL DEFAULT 0,
	`visible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_adminId_admins_id_fk` FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_listings` ADD CONSTRAINT `community_listings_createdBy_admins_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `admins`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_createdBy_admins_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `admins`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_updatedBy_admins_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `admins`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_settings` ADD CONSTRAINT `store_settings_updatedBy_admins_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `admins`(`id`) ON DELETE set null ON UPDATE no action;