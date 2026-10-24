CREATE TABLE "parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"setting" text NOT NULL,
	"cover_asset_id" uuid,
	"invite_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_combatants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" uuid NOT NULL,
	"hero_id" uuid,
	"npc_id" uuid,
	"initiative" integer,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "party_combatants_one_side" CHECK (("party_combatants"."hero_id" IS NULL) <> ("party_combatants"."npc_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "party_combats" (
	"party_id" uuid PRIMARY KEY NOT NULL,
	"phase" text NOT NULL,
	"round" integer DEFAULT 0 NOT NULL,
	"current_combatant_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_heroes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"character_id" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_members" (
	"party_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "party_members_party_id_user_id_pk" PRIMARY KEY("party_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "party_npcs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" uuid NOT NULL,
	"name" text NOT NULL,
	"portrait_asset_id" uuid,
	"max_hp" integer NOT NULL,
	"current_hp" integer NOT NULL,
	"armor_class" integer NOT NULL,
	"initiative_bonus" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "summary" jsonb;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_master_id_users_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_cover_asset_id_assets_id_fk" FOREIGN KEY ("cover_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_combatants" ADD CONSTRAINT "party_combatants_party_id_party_combats_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."party_combats"("party_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_combatants" ADD CONSTRAINT "party_combatants_hero_id_party_heroes_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."party_heroes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_combatants" ADD CONSTRAINT "party_combatants_npc_id_party_npcs_id_fk" FOREIGN KEY ("npc_id") REFERENCES "public"."party_npcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_combats" ADD CONSTRAINT "party_combats_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_combats" ADD CONSTRAINT "party_combats_current_combatant_id_party_combatants_id_fk" FOREIGN KEY ("current_combatant_id") REFERENCES "public"."party_combatants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_heroes" ADD CONSTRAINT "party_heroes_member_fk" FOREIGN KEY ("party_id","user_id") REFERENCES "public"."party_members"("party_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_heroes" ADD CONSTRAINT "party_heroes_character_fk" FOREIGN KEY ("user_id","character_id") REFERENCES "public"."characters"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_npcs" ADD CONSTRAINT "party_npcs_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_npcs" ADD CONSTRAINT "party_npcs_portrait_asset_id_assets_id_fk" FOREIGN KEY ("portrait_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "parties_invite_code_key" ON "parties" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "parties_master_id_idx" ON "parties" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX "party_combatants_party_id_idx" ON "party_combatants" USING btree ("party_id");--> statement-breakpoint
CREATE UNIQUE INDEX "party_combatants_hero_key" ON "party_combatants" USING btree ("hero_id");--> statement-breakpoint
CREATE UNIQUE INDEX "party_combatants_npc_key" ON "party_combatants" USING btree ("npc_id");--> statement-breakpoint
CREATE UNIQUE INDEX "party_heroes_character_key" ON "party_heroes" USING btree ("user_id","character_id");--> statement-breakpoint
CREATE INDEX "party_heroes_party_id_idx" ON "party_heroes" USING btree ("party_id");--> statement-breakpoint
CREATE INDEX "party_members_user_id_idx" ON "party_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "party_npcs_party_id_idx" ON "party_npcs" USING btree ("party_id");