import { createAiGateway, createStubAdapter } from '@koode/ai-gateway';
import { describe, expect, it } from 'vitest';
import { createTutorRuntime, TutorRuntimeError } from './tutor.js';

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
