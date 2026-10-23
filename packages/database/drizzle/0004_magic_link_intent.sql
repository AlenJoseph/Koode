ALTER TABLE "magic_link_tokens"
  ADD COLUMN IF NOT EXISTS "intent" text DEFAULT 'teacher' NOT NULL;
