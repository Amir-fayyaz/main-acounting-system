CREATE TABLE `account_role_mappings` (
	`tenant_id` varchar(64) NOT NULL,
	`role` enum('inventory','payable','input_vat','purchase_discount') NOT NULL,
	`account_id` varchar(64) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `account_role_mappings_tenant_role_unique` UNIQUE(`tenant_id`,`role`)
);
--> statement-breakpoint
ALTER TABLE `account_role_mappings` ADD CONSTRAINT `account_role_mappings_tenant_account_fk` FOREIGN KEY (`tenant_id`,`account_id`) REFERENCES `accounts`(`tenant_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_role_mappings_tenant_account_index` ON `account_role_mappings` (`tenant_id`,`account_id`);