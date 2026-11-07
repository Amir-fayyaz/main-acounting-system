CREATE TABLE `accounts` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(200) NOT NULL,
	`level` int NOT NULL,
	`parent_id` varchar(64),
	`type` enum('asset','liability','equity','revenue','expense') NOT NULL,
	`normal_balance` enum('debit','credit') NOT NULL,
	`postable` boolean NOT NULL,
	`active` boolean NOT NULL,
	`system` boolean NOT NULL,
	`revision` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_tenant_code_unique` UNIQUE(`tenant_id`,`code`),
	CONSTRAINT `accounts_tenant_id_unique` UNIQUE(`tenant_id`,`id`),
	CONSTRAINT `accounts_level_check` CHECK(`level` >= 1),
	CONSTRAINT `accounts_level_parent_check` CHECK((`parent_id` IS NULL AND `level` = 1) OR (`parent_id` IS NOT NULL AND `level` > 1))
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_tenant_parent_fk` FOREIGN KEY (`tenant_id`,`parent_id`) REFERENCES `accounts`(`tenant_id`,`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accounts_tenant_parent_index` ON `accounts` (`tenant_id`,`parent_id`);