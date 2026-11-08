CREATE TABLE `house_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`house_id` integer NOT NULL,
	`url` text NOT NULL,
	`alt` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`house_id`) REFERENCES `houses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `house_photos_house_idx` ON `house_photos` (`house_id`);--> statement-breakpoint
CREATE TABLE `houses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT '' NOT NULL,
	`public_location` text NOT NULL,
	`full_address` text DEFAULT '' NOT NULL,
	`map_url` text DEFAULT '' NOT NULL,
	`monthly_rent` integer NOT NULL,
	`bedrooms` integer DEFAULT 0 NOT NULL,
	`bathrooms` integer DEFAULT 0 NOT NULL,
	`floor_area_sqm` integer,
	`lot_area_sqm` integer,
	`utilities` text DEFAULT 'own' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`features` text DEFAULT '[]' NOT NULL,
	`terms` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'vacant' NOT NULL,
	`is_published` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `houses_slug_unique` ON `houses` (`slug`);--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`house_id` integer,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`preferred_date` text,
	`preferred_time` text,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`owner_note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`house_id`) REFERENCES `houses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `inquiries_status_idx` ON `inquiries` (`status`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`charge_id` integer NOT NULL,
	`tenant_id` integer NOT NULL,
	`house_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`paid_on` text NOT NULL,
	`method` text DEFAULT 'cash' NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`charge_id`) REFERENCES `rent_charges`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`house_id`) REFERENCES `houses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_charge_idx` ON `payments` (`charge_id`);--> statement-breakpoint
CREATE INDEX `payments_house_idx` ON `payments` (`house_id`);--> statement-breakpoint
CREATE TABLE `rent_charges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`house_id` integer NOT NULL,
	`period` text NOT NULL,
	`due_date` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`house_id`) REFERENCES `houses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rent_charges_tenant_period` ON `rent_charges` (`tenant_id`,`period`);--> statement-breakpoint
CREATE INDEX `rent_charges_house_idx` ON `rent_charges` (`house_id`);--> statement-breakpoint
CREATE INDEX `rent_charges_due_idx` ON `rent_charges` (`due_date`);--> statement-breakpoint
CREATE TABLE `repairs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`house_id` integer NOT NULL,
	`title` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`reported_on` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`completed_on` text,
	`cost` integer,
	`handled_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`house_id`) REFERENCES `houses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `repairs_house_idx` ON `repairs` (`house_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`house_id` integer NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`move_in_date` text NOT NULL,
	`lease_end_date` text,
	`monthly_rent` integer NOT NULL,
	`due_day` integer NOT NULL,
	`deposit_amount` integer,
	`notes` text DEFAULT '' NOT NULL,
	`moved_out_date` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`house_id`) REFERENCES `houses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tenants_house_idx` ON `tenants` (`house_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_one_current_per_house` ON `tenants` (`house_id`) WHERE moved_out_date IS NULL;--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);