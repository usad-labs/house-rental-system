CREATE TABLE `utility_bills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`house_id` integer NOT NULL,
	`kind` text NOT NULL,
	`period` text NOT NULL,
	`amount` integer NOT NULL,
	`due_date` text NOT NULL,
	`cutoff_date` text,
	`paid_on` text,
	`paid_by` text DEFAULT 'tenant' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`house_id`) REFERENCES `houses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `utility_bills_house_idx` ON `utility_bills` (`house_id`);--> statement-breakpoint
CREATE INDEX `utility_bills_due_idx` ON `utility_bills` (`due_date`);