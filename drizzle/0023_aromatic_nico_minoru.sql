ALTER TABLE "chats" ALTER COLUMN "messages_gzip_base64" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "message_count" SET DEFAULT 0;