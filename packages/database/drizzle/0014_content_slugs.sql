ALTER TABLE "pathways" ADD COLUMN IF NOT EXISTS "slug" text;
--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "slug" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pathways_slug_uidx" ON "pathways" ("slug") WHERE "slug" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "challenges_slug_uidx" ON "challenges" ("slug") WHERE "slug" IS NOT NULL;
