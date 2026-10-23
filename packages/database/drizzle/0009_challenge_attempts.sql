CREATE TABLE IF NOT EXISTS "challenge_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "challenge_id" uuid NOT NULL REFERENCES "challenges"("id") ON DELETE cascade,
  "status" text DEFAULT 'in_progress' NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
