ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'teacher' NOT NULL;
UPDATE "users" SET "role" = 'teacher' WHERE "role" IS NULL OR "role" = '';

CREATE TABLE IF NOT EXISTS "sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "teacher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "sections_code_uidx" ON "sections" ("code");

CREATE TABLE IF NOT EXISTS "section_students" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "section_id" uuid NOT NULL REFERENCES "sections"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "display_name" text NOT NULL,
  "secret_words_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "section_students_section_user_uidx"
  ON "section_students" ("section_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "section_students_section_display_uidx"
  ON "section_students" ("section_id", "display_name");
