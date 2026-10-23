import type { AiGateway } from '@koode/ai-gateway';
import { AiGatewayError } from '@koode/ai-gateway';
import {
  tutorTurnRequestSchema,
  tutorTurnResponseSchema,
  type TutorTurnRequest,
  type TutorTurnResponse,
} from '@koode/contracts';
import type { ContentLoader } from './content-loader.js';
import { buildPersonalizedTutorBlock } from './personalize.js';
import { buildTutorSystemPrompt, buildTutorUserPrompt } from './prompts.js';

export class TutorRuntimeError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'TutorRuntimeError';
  }
}

export type TutorRuntimeOptions = {
  /** Optional loader for content/ manuals (E8-S2). */
  contentLoader?: ContentLoader;
};

export function createTutorRuntime(gateway: AiGateway, options: TutorRuntimeOptions = {}) {
  const { contentLoader } = options;

  return {
    gatewayId: gateway.adapterId,
    async runTurn(input: unknown): Promise<TutorTurnResponse> {
      const request: TutorTurnRequest = tutorTurnRequestSchema.parse(input);

      let system = buildTutorSystemPrompt(request.locale, request.phase);
      if (
        contentLoader &&
        request.contentPathwayId &&
        request.contentChallengeId
      ) {
        try {
          const challenge = contentLoader.loadChallenge(
            request.contentPathwayId,
            request.contentChallengeId,
          );
          const block = buildPersonalizedTutorBlock(challenge, {
            pace: request.paceBand ?? 'steady',
            local_context: request.localContext,
            interests: request.interests,
            language_mix: request.locale,
          });
          system = `${system}\n\n${block.systemAddendum}`;
        } catch (error) {
          throw new TutorRuntimeError('Failed to load content challenge for personalization', 400, error);
        }
      }

      let raw: string;
      try {
        const completion = await gateway.complete({
          messages: [
            {
              role: 'system',
              content: system,
            },
            {
              role: 'user',
              content: buildTutorUserPrompt(request),
            },
          ],
          responseFormat: 'json_object',
          temperature: 0.3,
        });
        raw = completion.content;
      } catch (error) {
        if (error instanceof AiGatewayError) {
          throw new TutorRuntimeError(error.message, 502, error);
        }
        throw new TutorRuntimeError('Tutor model call failed', 502, error);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        throw new TutorRuntimeError('Tutor returned non-JSON output', 502, error);
      }

      const validated = tutorTurnResponseSchema.safeParse(parsed);
      if (!validated.success) {
        throw new TutorRuntimeError('Tutor output failed schema validation', 502, validated.error);
      }

      return validated.data;
    },
  };
}

export type TutorRuntime = ReturnType<typeof createTutorRuntime>;
