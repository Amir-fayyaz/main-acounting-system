CREATE TABLE `suppliers` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`normalized_name` varchar(200) NOT NULL,
	`identification_number` varchar(50),
	`contact_phone` varchar(32),
	`contact_email` varchar(254),
	`contact_address` varchar(500),
	`contact_postal_code` varchar(20),
	`status` enum('active','inactive') NOT NULL,
	`revision` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppliers_tenant_code_unique` UNIQUE(`tenant_id`,`code`),
	CONSTRAINT `suppliers_tenant_identification_unique` UNIQUE(`tenant_id`,`identification_number`),
	CONSTRAINT `suppliers_status_check` CHECK(`status` IN ('active', 'inactive'))
);
--> statement-breakpoint
CREATE INDEX `suppliers_tenant_normalized_name_index` ON `suppliers` (`tenant_id`,`normalized_name`);