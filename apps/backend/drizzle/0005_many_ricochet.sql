CREATE TABLE IF NOT EXISTS `fiscal_periods` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`fiscal_year_id` varchar(64) NOT NULL,
	`jalali_year` int NOT NULL,
	`sequence` int NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`state` enum('open','closed') NOT NULL,
	`revision` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `fiscal_periods_id` PRIMARY KEY(`id`),
	CONSTRAINT `fiscal_periods_year_sequence_unique` UNIQUE(`tenant_id`,`fiscal_year_id`,`sequence`),
	CONSTRAINT `fiscal_periods_range_check` CHECK(start_date < end_date),
	KEY `fiscal_periods_tenant_year_index` (`tenant_id`,`fiscal_year_id`,`sequence`),
	KEY `fiscal_periods_tenant_range_index` (`tenant_id`,`start_date`,`end_date`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tenant_active_periods` (
	`tenant_id` varchar(64) NOT NULL,
	`period_id` varchar(64) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `tenant_active_periods_tenant_id` PRIMARY KEY(`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `platform_authorizations` (
	`user_id` varchar(64) NOT NULL,
	`role` varchar(64) NOT NULL,
	`granted_at` datetime(3) NOT NULL,
	CONSTRAINT `platform_authorizations_user_id` PRIMARY KEY(`user_id`),
	CONSTRAINT `platform_authorizations_role_check` CHECK(`platform_authorizations`.`role` = 'system-admin')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `seed_fixtures` (
	`fixture_key` varchar(128) NOT NULL,
	`entity_type` varchar(32) NOT NULL,
	`entity_id` varchar(128) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `seed_fixtures_fixture_key` PRIMARY KEY(`fixture_key`)
);
