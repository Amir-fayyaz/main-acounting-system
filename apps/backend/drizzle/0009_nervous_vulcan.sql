CREATE TABLE `account_template_applications` (
	`tenant_id` varchar(64) NOT NULL,
	`template_version` varchar(64) NOT NULL,
	`applied_at` datetime(3) NOT NULL,
	CONSTRAINT `account_template_applications_tenant_version_unique` UNIQUE(`tenant_id`,`template_version`)
);
