ALTER TABLE "sources" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "content_hash_type" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "file_size" bigint;