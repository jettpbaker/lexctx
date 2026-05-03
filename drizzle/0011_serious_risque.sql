ALTER TABLE "chats" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "total_input_tokens" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "total_input_tokens" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "total_output_tokens" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "total_output_tokens" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "total_tokens" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "total_tokens" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "total_cost_micro_usd" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "total_cost_micro_usd" DROP NOT NULL;