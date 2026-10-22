import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function signCookieValue(value: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(value).digest('base64url');
  return `${value}.${signature}`;
}

export function verifyCookieValue(signed: string, secret: string): string | null {
  const separator = signed.lastIndexOf('.');
  if (separator <= 0) {
    return null;
  }
  const value = signed.slice(0, separator);
  const signature = signed.slice(separator + 1);
  const expected = createHmac('sha256', secret).update(value).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  return value;
}
