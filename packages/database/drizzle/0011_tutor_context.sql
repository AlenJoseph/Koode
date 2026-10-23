ALTER TABLE "tutor_turns" ADD COLUMN IF NOT EXISTS "pathway_id" uuid REFERENCES "pathways"("id") ON DELETE set null;
ALTER TABLE "tutor_turns" ADD COLUMN IF NOT EXISTS "challenge_id" uuid REFERENCES "challenges"("id") ON DELETE set null;
