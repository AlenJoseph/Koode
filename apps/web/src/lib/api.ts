import type { SessionUser } from '@koode/contracts';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API ${path} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function requestMagicLink(email: string): Promise<{
  ok: true;
  email: string;
  devToken?: string;
  devVerifyUrl?: string;
}> {
  return apiFetch('/auth/magic-link/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyMagicLink(token: string): Promise<{ ok: true; user: SessionUser }> {
  return apiFetch('/auth/magic-link/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function fetchMe(): Promise<{ user: SessionUser } | null> {
  const response = await fetch(`${apiBase}/auth/me`, {
    credentials: 'include',
  });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`API /auth/me failed with ${response.status}`);
  }
  return (await response.json()) as { user: SessionUser };
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}
