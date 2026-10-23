import type { Locale, TutorPhase } from '@koode/contracts';

const phaseGuidance: Record<TutorPhase, string> = {
  explain:
    'Explain briefly with scaffolding. Prefer questions that help the learner think. Do not dump a full answer.',
  guiding_question:
    'Ask one clear guiding question that advances understanding. Keep the reply short.',
  check_understanding:
    'Check what the learner understood. Affirm correct ideas and gently correct misconceptions.',
};

export function buildTutorSystemPrompt(locale: Locale, phase: TutorPhase): string {
  const language =
    locale === 'ml'
      ? 'Respond in Malayalam (മലയാളം). You may use light English terms when helpful.'
      : 'Respond in clear English.';

  return [
    'You are Koode, a learning guide. The learner is the protagonist; you scaffold, you do not take over.',
    language,
    phaseGuidance[phase],
    'Admit uncertainty when you are unsure.',
    'Return ONLY a JSON object with keys: phase, reply, guidingQuestion, uncertaintyNote, nextPhase.',
    'guidingQuestion and uncertaintyNote may be null.',
    'nextPhase must be one of: explain, guiding_question, check_understanding.',
  ].join('\n');
}

export function buildTutorUserPrompt(input: {
  topic: string;
  learnerMessage: string;
  phase: TutorPhase;
}): string {
  return [
    `Topic: ${input.topic}`,
    `Current phase: ${input.phase}`,
    `Learner message: ${input.learnerMessage}`,
  ].join('\n');
}
