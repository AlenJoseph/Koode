import type { ChatRequest, ChatResponse, ModelAdapter } from '../types.js';

export type StubAdapterOptions = {
  id?: string;
  /** Fixed content, or a function of the last user message. */
  content?: string | ((request: ChatRequest) => string);
};

/**
 * Deterministic adapter for tests and offline demos.
 * Never calls a remote model.
 */
export function createStubAdapter(options: StubAdapterOptions = {}): ModelAdapter {
  return {
    id: options.id ?? 'stub',
    async complete(request: ChatRequest): Promise<ChatResponse> {
      const lastUser = [...request.messages].reverse().find((m) => m.role === 'user');
      const content =
        typeof options.content === 'function'
          ? options.content(request)
          : (options.content ??
            JSON.stringify({
              phase: 'explain',
              reply: `Stub tutor: I heard "${lastUser?.content ?? ''}". What do you already know about this?`,
              guidingQuestion: 'What is one thing you want to understand better?',
              uncertaintyNote: 'This is a stub response for offline development.',
              nextPhase: 'guiding_question',
            }));

      return {
        content,
        model: 'stub-model',
        usage: {
          inputTokens: request.messages.reduce((n, m) => n + m.content.length, 0),
          outputTokens: content.length,
        },
        finishReason: 'stop',
      };
    },
  };
}
