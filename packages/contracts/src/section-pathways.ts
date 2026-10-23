import { z } from 'zod';

export const setSectionPathwaysSchema = z.object({
  pathwayIds: z.array(z.string().uuid()).max(20),
});

export type SetSectionPathwaysInput = z.infer<typeof setSectionPathwaysSchema>;
