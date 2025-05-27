CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`organizationId` text,
	`action` text NOT NULL,
	`tableName` text NOT NULL,
	`recordCount` integer DEFAULT 0 NOT NULL,
	`query` text NOT NULL,
	`bypassUsed` integer DEFAULT false NOT NULL,
	`success` integer DEFAULT true NOT NULL,
	`errorMessage` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `document` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`projectId` text,
	`title` text NOT NULL,
	`content` text,
	`filePath` text,
	`mimeType` text,
	`size` integer,
	`createdAt` integer,
	`updatedAt` integer,
	`createdBy` text NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`createdAt` integer,
	`updatedAt` integer,
	`createdBy` text NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `user` ADD `organizationId` text REFERENCES organization(id);