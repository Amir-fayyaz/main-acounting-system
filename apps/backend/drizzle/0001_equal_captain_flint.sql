CREATE TABLE `fiscal_years` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`label` varchar(100) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`status` enum('open','closed') NOT NULL,
	`revision` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `fiscal_years_id` PRIMARY KEY(`id`),
	CONSTRAINT `fiscal_years_tenant_label_unique` UNIQUE(`tenant_id`,`label`),
	CONSTRAINT `fiscal_years_range_check` CHECK(start_date < end_date)
);
--> statement-breakpoint
ALTER TABLE `roles` ADD CONSTRAINT `roles_tenant_name_unique` UNIQUE(`tenant_id`,`name`);--> statement-breakpoint
CREATE INDEX `fiscal_years_tenant_range_index` ON `fiscal_years` (`tenant_id`,`start_date`,`end_date`);