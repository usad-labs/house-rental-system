CREATE TABLE `payment_claims` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`charge_id` integer NOT NULL,
	`tenant_id` integer NOT NULL,
	`method` text NOT NULL,
	`proof_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`charge_id`) REFERENCES `rent_charges`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payment_claims_status_idx` ON `payment_claims` (`status`);--> statement-breakpoint
CREATE TABLE `reminder_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`charge_id` integer,
	`status` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`sent_on` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`charge_id`) REFERENCES `rent_charges`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reminder_log_charge_idx` ON `reminder_log` (`charge_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tenants` ADD `messenger_psid` text;--> statement-breakpoint
ALTER TABLE `tenants` ADD `messenger_link_token` text;