ALTER TABLE "magic_link_tokens"
  ADD COLUMN IF NOT EXISTS "claim_user_id" uuid REFERENCES "users"("id") ON DELETE cascade;
