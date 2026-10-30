CREATE TABLE `platform_authorizations` (
	`user_id` varchar(64) NOT NULL,
	`role` varchar(64) NOT NULL,
	`granted_at` datetime(3) NOT NULL,
	CONSTRAINT `platform_authorizations_user_id` PRIMARY KEY(`user_id`),
	CONSTRAINT `platform_authorizations_role_check` CHECK(`role` = 'system-admin')
);
