ALTER TABLE "party_heroes" ADD COLUMN "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- The master's heroes already at a table wait for the master to show them, like new ones.
UPDATE "party_heroes" SET "hidden" = true FROM "parties" WHERE "parties"."id" = "party_heroes"."party_id" AND "parties"."master_id" = "party_heroes"."user_id";
