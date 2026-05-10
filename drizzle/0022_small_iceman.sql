ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "mux_blur_data_url" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "mux_blur_aspect_ratio" double precision;