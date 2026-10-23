import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contentChallengeSchema, type ContentChallenge } from '@koode/contracts';

export type ContentLoaderOptions = {
  /** Absolute path to repo `content/` directory. */
  contentRoot: string;
};

/**
 * Load a authored challenge manual from disk (JSON).
 * Pathway/challenge ids are kebab-case content ids, not DB UUIDs.
 */
export function createContentLoader(options: ContentLoaderOptions) {
  const { contentRoot } = options;

  return {
    loadChallenge(pathwayId: string, challengeId: string): ContentChallenge {
      const path = join(contentRoot, 'pathways', pathwayId, 'challenges', `${challengeId}.json`);
      const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
      const challenge = contentChallengeSchema.parse(raw);
      if (challenge.id !== challengeId) {
        throw new Error(`Challenge id mismatch: file ${challengeId} has id ${challenge.id}`);
      }
      return challenge;
    },
  };
}

export type ContentLoader = ReturnType<typeof createContentLoader>;
