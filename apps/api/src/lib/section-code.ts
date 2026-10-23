import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Code.org-style 6-character section code (no ambiguous 0/O/1/I). */
export function generateSectionCode(): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)]!;
  }
  return code;
}
