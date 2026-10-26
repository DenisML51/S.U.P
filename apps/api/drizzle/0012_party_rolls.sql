CREATE TABLE "party_rolls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"hero_id" uuid,
	"hero_name" text,
	"audience" uuid[],
	"dice" jsonb NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "party_rolls" ADD CONSTRAINT "party_rolls_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_rolls" ADD CONSTRAINT "party_rolls_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_rolls" ADD CONSTRAINT "party_rolls_hero_id_party_heroes_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."party_heroes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "party_rolls_party_created_idx" ON "party_rolls" USING btree ("party_id","created_at","id");