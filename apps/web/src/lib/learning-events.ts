import type { LearningEventEnvelope, LearningEventType } from '@koode/contracts';
import { ingestLearningEvents } from '@/lib/api';

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type EmitInput = {
  eventType: LearningEventType;
  pathwayId?: string | null;
  contentId?: string | null;
  stepId?: string | null;
  payload?: Record<string, unknown>;
};

const lastProgressAt = new Map<string, number>();

/** Throttle high-volume progress heartbeats (itza hot-partition lesson). */
export function shouldEmitProgress(key: string, minIntervalMs = 12_000): boolean {
  const now = Date.now();
  const prev = lastProgressAt.get(key) ?? 0;
  if (now - prev < minIntervalMs) {
    return false;
  }
  lastProgressAt.set(key, now);
  return true;
}

export function buildLearningEvent(input: EmitInput): Omit<LearningEventEnvelope, 'learnerId'> {
  return {
    eventId: randomUuid(),
    eventType: input.eventType,
    pathwayId: input.pathwayId ?? null,
    contentId: input.contentId ?? null,
    stepId: input.stepId ?? null,
    occurredAt: new Date().toISOString(),
    payload: input.payload ?? {},
  };
}

export async function emitLearningEvents(inputs: EmitInput[]) {
  const events = inputs.map(buildLearningEvent);
  return ingestLearningEvents(events);
}

export async function emitLearningEvent(input: EmitInput) {
  return emitLearningEvents([input]);
}
