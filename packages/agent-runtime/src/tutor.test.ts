import { createAiGateway, createStubAdapter } from '@koode/ai-gateway';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { createContentLoader } from './content-loader.js';
import { createTutorRuntime, TutorRuntimeError } from './tutor.js';

const contentRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../content');

describe('tutor runtime', () => {
  it('returns a schema-valid turn via the stub adapter', async () => {
    const gateway = createAiGateway({
      adapter: createStubAdapter({
        content: JSON.stringify({
          phase: 'explain',
          reply: 'Rainfall varies by season. What patterns have you noticed locally?',
          guidingQuestion: 'How would you measure rainfall for one week?',
          uncertaintyNote: null,
          nextPhase: 'guiding_question',
        }),
      }),
    });
    const tutor = createTutorRuntime(gateway);
    const turn = await tutor.runTurn({
      locale: 'en',
      topic: 'local rainfall',
      learnerMessage: 'I want to understand rain near my home',
      phase: 'explain',
    });
    expect(turn.phase).toBe('explain');
    expect(turn.nextPhase).toBe('guiding_question');
    expect(turn.reply.length).toBeGreaterThan(10);
  });

  it('injects content personalization into the system prompt', async () => {
    const complete = vi.fn(async (request: { messages: Array<{ role: string; content: string }> }) => {
      const system = request.messages.find((m) => m.role === 'system')?.content ?? '';
      expect(system).toContain('pause-before-react');
      expect(system).toContain('Locked correctOptionIds: b');
      expect(system).toContain('busy city school');
      return {
        content: JSON.stringify({
          phase: 'explain',
          reply: 'Try three slow breaths before you answer.',
          guidingQuestion: 'What pause tool fits this moment?',
          uncertaintyNote: null,
          nextPhase: 'guiding_question',
        }),
        model: 'spy',
        usage: { inputTokens: 1, outputTokens: 1 },
        finishReason: 'stop' as const,
      };
    });
    const gateway = createAiGateway({
      adapter: { id: 'spy', complete },
    });
    const tutor = createTutorRuntime(gateway, {
      contentLoader: createContentLoader({ contentRoot }),
    });
    await tutor.runTurn({
      locale: 'en',
      topic: 'pause skills',
      learnerMessage: 'I get angry fast',
      phase: 'explain',
      contentPathwayId: 'know-yourself',
      contentChallengeId: 'pause-before-react',
      paceBand: 'supported',
      localContext: 'busy city school',
    });
    expect(complete).toHaveBeenCalledOnce();
  });

  it('rejects invalid model JSON', async () => {
    const gateway = createAiGateway({
      adapter: createStubAdapter({ content: 'not-json' }),
    });
    const tutor = createTutorRuntime(gateway);
    await expect(
      tutor.runTurn({
        locale: 'ml',
        topic: 'കൃഷി',
        learnerMessage: 'ഹലോ',
      }),
    ).rejects.toBeInstanceOf(TutorRuntimeError);
  });
});
