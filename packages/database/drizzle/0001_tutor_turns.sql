CREATE TABLE IF NOT EXISTS "tutor_turns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "locale" text NOT NULL,
  "topic" text NOT NULL,
  "phase" text NOT NULL,
  "next_phase" text NOT NULL,
  "learner_message_hash" text NOT NULL,
  "reply" text NOT NULL,
  "guiding_question" text,
  "uncertainty_note" text,
  "adapter_id" text NOT NULL,
  "request_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tutor_turns_user_id_created_at_idx"
  ON "tutor_turns" ("user_id", "created_at" DESC);
