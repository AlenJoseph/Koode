import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  contentCatalogSchema,
  contentChallengeSchema,
  contentPathwaySchema,
} from './content.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const contentRoot = join(repoRoot, 'content');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

describe('content manuals', () => {
  const catalog = contentCatalogSchema.parse(readJson(join(contentRoot, 'catalog.json')));

  it('lists exactly the six starter pathways', () => {
    expect(catalog.pathways).toEqual([
      'know-yourself',
      'think-it-through',
      'body-and-care',
      'money-sense',
      'civic-life',
      'living-world',
    ]);
  });

  it('validates every pathway and its ordered challenges', () => {
    for (const pathwayId of catalog.pathways) {
      const pathwayDir = join(contentRoot, 'pathways', pathwayId);
      const pathway = contentPathwaySchema.parse(readJson(join(pathwayDir, 'pathway.json')));
      expect(pathway.id).toBe(pathwayId);

      const challengeFiles = readdirSync(join(pathwayDir, 'challenges')).filter((f) =>
        f.endsWith('.json'),
      );
      const fileIds = challengeFiles.map((f) => f.replace(/\.json$/, '')).sort();
      const orderIds = [...pathway.challengeOrder].sort();
      expect(fileIds).toEqual(orderIds);

      for (const challengeId of pathway.challengeOrder) {
        const challenge = contentChallengeSchema.parse(
          readJson(join(pathwayDir, 'challenges', `${challengeId}.json`)),
        );
        expect(challenge.id).toBe(challengeId);

        if (challenge.quiz) {
          for (const item of challenge.quiz) {
            const optionIds = item.options.map((o) => o.id);
            expect(optionIds).toContain(item.correctOptionId);
            expect(new Set(optionIds).size).toBe(optionIds.length);
          }
        }
      }
    }
  });
});
