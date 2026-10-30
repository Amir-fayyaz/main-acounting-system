ALTER TABLE `users` ADD `failed_auth_attempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `locked_until` datetime(3);