CREATE TABLE `tag` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL UNIQUE,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL
);

CREATE TABLE `document_tag` (
  `id` text PRIMARY KEY NOT NULL,
  `documentId` text NOT NULL,
  `tagId` text NOT NULL,
  `confidence` real NOT NULL,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL,
  FOREIGN KEY (`documentId`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`tagId`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade,
  UNIQUE(`documentId`, `tagId`)
); 