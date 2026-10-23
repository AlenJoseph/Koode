CREATE TABLE IF NOT EXISTS "user_emails" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "email" text NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "verified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_emails_email_uidx" ON "user_emails" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "user_emails_one_primary_uidx"
  ON "user_emails" ("user_id")
  WHERE ("is_primary" = true);

INSERT INTO "user_emails" ("user_id", "email", "is_primary", "verified_at")
SELECT "id", lower("email"), true, now()
FROM "users"
WHERE "email" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "user_emails" ue WHERE ue."email" = lower("users"."email")
  );

ALTER TABLE "users" DROP COLUMN IF EXISTS "email";
