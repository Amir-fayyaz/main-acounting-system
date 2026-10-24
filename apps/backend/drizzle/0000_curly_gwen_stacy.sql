CREATE TABLE `audit_records` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(128),
	`actor_type` enum('user','system') NOT NULL,
	`actor_user_id` varchar(128),
	`action` varchar(128) NOT NULL,
	`target_type` varchar(128),
	`target_id` varchar(128),
	`outcome` enum('success','failure','denied') NOT NULL,
	`occurred_at` datetime(3) NOT NULL,
	`correlation_id` varchar(128),
	`causation_id` varchar(128),
	`metadata` mediumtext,
	`revision` int NOT NULL,
	CONSTRAINT `audit_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`revoked_at` datetime(3),
	`revision` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_sessions_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `user_credentials` (
	`user_id` varchar(64) NOT NULL,
	`password_hash` varchar(512) NOT NULL,
	`revision` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `user_credentials_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `membership_roles` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`membership_id` varchar(64) NOT NULL,
	`role_id` varchar(64) NOT NULL,
	`status` enum('active','inactive') NOT NULL,
	`revision` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `membership_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `membership_roles_pair_unique` UNIQUE(`membership_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`status` enum('active','inactive') NOT NULL,
	`revision` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `memberships_user_tenant_unique` UNIQUE(`user_id`,`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` varchar(64) NOT NULL,
	`permission_key` varchar(120) NOT NULL,
	CONSTRAINT `role_permissions_role_id_permission_key_pk` PRIMARY KEY(`role_id`,`permission_key`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`status` enum('active','inactive') NOT NULL,
	`revision` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(64) NOT NULL,
	`display_name` varchar(200) NOT NULL,
	`email` varchar(254) NOT NULL,
	`status` enum('active','inactive') NOT NULL,
	`revision` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` varchar(64) NOT NULL,
	`name` varchar(200) NOT NULL,
	`status` enum('active','inactive') NOT NULL,
	`revision` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `outbox_events` (
	`id` varchar(64) NOT NULL,
	`event_id` varchar(128) NOT NULL,
	`event_type` varchar(128) NOT NULL,
	`event_version` int NOT NULL,
	`payload` mediumtext NOT NULL,
	`tenant_id` varchar(128),
	`correlation_id` varchar(128),
	`causation_id` varchar(128),
	`created_at` datetime(3) NOT NULL,
	`state` enum('pending','publishing','published','retrying','failed') NOT NULL,
	`attempt_count` int NOT NULL DEFAULT 0,
	`last_attempt_at` datetime(3),
	`last_failure` mediumtext,
	`published_at` datetime(3),
	`next_attempt_at` datetime(3),
	`claim_id` varchar(64),
	CONSTRAINT `outbox_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `outbox_events_event_id_unique` UNIQUE(`event_id`)
);
--> statement-breakpoint
CREATE INDEX `audit_records_tenant_occurred_index` ON `audit_records` (`tenant_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_records_actor_index` ON `audit_records` (`actor_user_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_records_action_index` ON `audit_records` (`action`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_records_target_index` ON `audit_records` (`target_type`,`target_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_records_outcome_index` ON `audit_records` (`outcome`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_records_correlation_index` ON `audit_records` (`correlation_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_id_index` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `membership_roles_tenant_index` ON `membership_roles` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `memberships_tenant_index` ON `memberships` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `roles_tenant_index` ON `roles` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `tenants_name_index` ON `tenants` (`name`);--> statement-breakpoint
CREATE INDEX `outbox_events_state_due_index` ON `outbox_events` (`state`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `outbox_events_created_at_index` ON `outbox_events` (`created_at`);