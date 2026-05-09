ALTER TYPE "public"."video_status" ADD VALUE 'pending_upload' BEFORE 'processing';--> statement-breakpoint
ALTER TYPE "public"."video_status" ADD VALUE 'uploading' BEFORE 'processing';