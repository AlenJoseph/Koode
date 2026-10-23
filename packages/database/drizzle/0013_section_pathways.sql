CREATE TABLE IF NOT EXISTS "section_pathways" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "section_id" uuid NOT NULL REFERENCES "sections"("id") ON DELETE cascade,
  "pathway_id" uuid NOT NULL REFERENCES "pathways"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "section_pathways_section_pathway_uidx"
  ON "section_pathways" ("section_id", "pathway_id");
