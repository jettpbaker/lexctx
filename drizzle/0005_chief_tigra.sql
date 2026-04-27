CREATE TABLE "transcript_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"index" integer NOT NULL,
	"start_seconds" double precision NOT NULL,
	"end_seconds" double precision NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transcript_segments_source_id_index_unique" UNIQUE("source_id","index")
);
--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "transcript_text" text;--> statement-breakpoint
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transcript_segments_source_id_idx" ON "transcript_segments" USING btree ("source_id");--> statement-breakpoint
ALTER TABLE "sources" DROP COLUMN "transcript_url";--> statement-breakpoint
ALTER TABLE "sources" DROP COLUMN "chunk_count";