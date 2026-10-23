import {
  contentChallengeSchema,
  paceBandSchema,
  type ContentChallenge,
  type PaceBand,
} from '@koode/contracts';
import { z } from 'zod';

const profileSchema = z.object({
  pace: paceBandSchema.default('steady'),
  reading_level: z.string().trim().max(80).default('grade-appropriate'),
  local_context: z.string().trim().max(500).default('local school and neighbourhood'),
  interests: z.string().trim().max(500).default('everyday life'),
  language_mix: z.string().trim().max(80).default('en'),
});

export type PersonalizeProfile = z.infer<typeof profileSchema>;

/**
 * Fill `{{placeholders}}` from the content manual personalizeTemplate.
 * Unknown placeholders are left as-is so authors notice missing vars.
 */
export function fillPersonalizeTemplate(
  template: string,
  profile: Partial<PersonalizeProfile>,
): string {
  const vars = profileSchema.parse(profile);
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => {
    if (key in vars) {
      return String(vars[key as keyof PersonalizeProfile]);
    }
    return match;
  });
}

export type PersonalizedTutorBlock = {
  systemAddendum: string;
  /** Canonical ids that must survive any rewrite. */
  locked: {
    challengeId: string;
    objectives: string[];
    successCriteria: string[];
    correctOptionIds: string[];
  };
};

/**
 * Build tutor prompt addendum from a content challenge + pace band.
 * Does not rewrite quiz options — that happens at a later content-render step.
 * The tutor is instructed never to change correctOptionId / objectives.
 */
export function buildPersonalizedTutorBlock(
  challenge: ContentChallenge,
  profile: Partial<PersonalizeProfile> = {},
): PersonalizedTutorBlock {
  const parsed = contentChallengeSchema.parse(challenge);
  const vars = profileSchema.parse(profile);
  const pace: PaceBand = vars.pace;
  const band = parsed.llm.paceBands[pace];
  const filled = fillPersonalizeTemplate(parsed.llm.personalizeTemplate, vars);

  const correctOptionIds = (parsed.quiz ?? []).map((item) => item.correctOptionId);

  const systemAddendum = [
    '--- Content personalization (trusted skeleton) ---',
    `Challenge id: ${parsed.id}`,
    `Title: ${parsed.title}`,
    `Objectives (do not change): ${parsed.objectives.join('; ')}`,
    `Success criteria (do not change): ${parsed.successCriteria.join('; ')}`,
    `Tutor brief: ${parsed.llm.tutorBrief}`,
    `Pace band: ${pace} | hintDensity=${band.hintDensity} | stepSize=${band.stepSize}`,
    `Coach note: ${band.coachNote}`,
    `Personalize instructions: ${filled}`,
    'HARD RULES: Never change quiz correctOptionId values. Never invent new learning objectives. Guide; do not spoil answers. No diagnosis language.',
    correctOptionIds.length > 0
      ? `Locked correctOptionIds: ${correctOptionIds.join(', ')}`
      : 'No quiz items on this challenge.',
  ].join('\n');

  return {
    systemAddendum,
    locked: {
      challengeId: parsed.id,
      objectives: [...parsed.objectives],
      successCriteria: [...parsed.successCriteria],
      correctOptionIds,
    },
  };
}

/** Assert a rewritten quiz (if any) kept the same correct option ids. */
export function assertCorrectOptionIdsUnchanged(
  canonical: ContentChallenge,
  candidateQuiz: Array<{ id: string; correctOptionId: string }> | undefined,
): void {
  const original = canonical.quiz ?? [];
  if (!candidateQuiz) {
    return;
  }
  if (candidateQuiz.length !== original.length) {
    throw new Error('Personalized quiz must keep the same number of items');
  }
  for (let i = 0; i < original.length; i += 1) {
    const a = original[i]!;
    const b = candidateQuiz[i]!;
    if (a.id !== b.id || a.correctOptionId !== b.correctOptionId) {
      throw new Error(
        `correctOptionId must not change for quiz item ${a.id} (was ${a.correctOptionId}, got ${b.correctOptionId})`,
      );
    }
  }
}
