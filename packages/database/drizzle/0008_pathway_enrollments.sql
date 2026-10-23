CREATE TABLE IF NOT EXISTS "pathway_enrollments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "pathway_id" uuid NOT NULL REFERENCES "pathways"("id") ON DELETE cascade,
  "status" text DEFAULT 'active' NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "pathway_enrollments_user_pathway_uidx"
  ON "pathway_enrollments" ("user_id", "pathway_id");
