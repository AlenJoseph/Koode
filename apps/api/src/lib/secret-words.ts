import { randomInt } from 'node:crypto';

/** Simple child-friendly word bank for classroom secret-word passwords (no external package). */
const WORDS = [
  'APPLE',
  'RIVER',
  'CLOUD',
  'TIGER',
  'MANGO',
  'OCEAN',
  'PENCIL',
  'SUNNY',
  'GREEN',
  'BOOK',
  'STAR',
  'MOON',
  'TREE',
  'BIRD',
  'STONE',
  'WATER',
  'LIGHT',
  'HAPPY',
  'MUSIC',
  'GARDEN',
  'FRIEND',
  'ORANGE',
  'PURPLE',
  'CIRCLE',
  'BRIDGE',
  'CASTLE',
  'FLOWER',
  'PLANET',
  'ROCKET',
  'SILVER',
] as const;

function pickWord(exclude?: string): string {
  const pool = exclude ? WORDS.filter((word) => word !== exclude) : [...WORDS];
  const index = randomInt(pool.length);
  return pool[index] ?? 'APPLE';
}

/** Two-word secret, e.g. "MANGO RIVER" — shown once to the teacher for login cards. */
export function generateSecretWords(): string {
  const first = pickWord();
  const second = pickWord(first);
  return `${first} ${second}`;
}

export function normalizeSecretWords(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, ' ');
}
