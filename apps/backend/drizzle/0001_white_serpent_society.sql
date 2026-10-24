CREATE TABLE `user_active_companies` (
	`user_id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`selected_at` datetime(3) NOT NULL,
	CONSTRAINT `user_active_companies_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `roles` ADD CONSTRAINT `roles_tenant_name_unique` UNIQUE(`tenant_id`,`name`);