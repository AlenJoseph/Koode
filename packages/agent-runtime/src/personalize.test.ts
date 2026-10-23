import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentChallengeSchema } from '@koode/contracts';
import { describe, expect, it } from 'vitest';
import {
  assertCorrectOptionIdsUnchanged,
  buildPersonalizedTutorBlock,
  fillPersonalizeTemplate,
} from './personalize.js';

const contentRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../content');

function loadChallenge(pathwayId: string, challengeId: string) {
  const path = join(contentRoot, 'pathways', pathwayId, 'challenges', `${challengeId}.json`);
  return contentChallengeSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

describe('E8-S2 content personalization', () => {
  it('fills personalizeTemplate placeholders', () => {
    const filled = fillPersonalizeTemplate(
      'Pace={{pace}}. Local={{local_context}}. Interests={{interests}}.',
      { pace: 'supported', local_context: 'Kerala monsoon', interests: 'football' },
    );
    expect(filled).toContain('Pace=supported');
    expect(filled).toContain('Kerala monsoon');
    expect(filled).toContain('football');
  });

  it('builds tutor addendum with locked correctOptionIds from manuals', () => {
    const challenge = loadChallenge('know-yourself', 'pause-before-react');
    const block = buildPersonalizedTutorBlock(challenge, {
      pace: 'fast',
      local_context: 'busy city school',
    });
    expect(block.locked.challengeId).toBe('pause-before-react');
    expect(block.locked.correctOptionIds).toEqual(['b']);
    expect(block.systemAddendum).toContain('Locked correctOptionIds: b');
    expect(block.systemAddendum).toContain('hintDensity=low');
    expect(block.systemAddendum).toContain('Never change quiz correctOptionId');
  });

  it('rejects rewritten quizzes that change correctOptionId', () => {
    const challenge = loadChallenge('money-sense', 'fair-or-trap');
    expect(() =>
      assertCorrectOptionIdsUnchanged(challenge, [
        { id: 'q1', correctOptionId: 'a' },
      ]),
    ).toThrow(/correctOptionId must not change/);

    expect(() =>
      assertCorrectOptionIdsUnchanged(challenge, [
        { id: 'q1', correctOptionId: challenge.quiz![0]!.correctOptionId },
      ]),
    ).not.toThrow();
  });
});
