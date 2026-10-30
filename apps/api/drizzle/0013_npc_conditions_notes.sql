ALTER TABLE "parties" ADD COLUMN "master_notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "party_npcs" ADD COLUMN "conditions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "party_npcs" ADD COLUMN "attacks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "party_npcs" ADD COLUMN "notes" text DEFAULT '' NOT NULL;