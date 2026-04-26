ALTER TYPE "public"."source_status" ADD VALUE 'pending_upload' BEFORE 'transcribing';--> statement-breakpoint
ALTER TABLE "sources" ALTER COLUMN "collection_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ALTER COLUMN "status" SET DEFAULT 'pending_upload';--> statement-breakpoint
ALTER TABLE "sources" ALTER COLUMN "audio_url" DROP NOT NULL;