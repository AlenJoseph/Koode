import type { SessionUser, TutorTurnRequest, TutorTurnResponse } from '@koode/contracts';

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

export async function requestMagicLink(
  email: string,
  intent: 'teacher' | 'learner' = 'teacher',
): Promise<{
  ok: true;
  email: string;
  intent?: string;
  devToken?: string;
  devVerifyUrl?: string;
}> {
  return apiFetch('/auth/magic-link/request', {
    method: 'POST',
    body: JSON.stringify({ email, intent }),
  });
}

export async function verifyMagicLink(token: string): Promise<{ ok: true; user: SessionUser }> {
  return apiFetch('/auth/magic-link/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function requestClaimEmail(email: string): Promise<{
  ok: true;
  email: string;
  intent: 'claim';
  devToken?: string;
  devVerifyUrl?: string;
}> {
  return apiFetch('/auth/emails/claim/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
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

export async function runTutorTurn(
  input: TutorTurnRequest,
): Promise<{ ok: true; adapter: string; turn: TutorTurnResponse }> {
  return apiFetch('/tutor/turn', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type ClassroomSection = { id: string; name: string; code: string };

export async function listSections(): Promise<{ sections: ClassroomSection[] }> {
  return apiFetch('/classroom/sections');
}

export async function createSection(name: string): Promise<{ section: ClassroomSection }> {
  return apiFetch('/classroom/sections', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function listRoster(
  sectionId: string,
): Promise<{ roster: Array<{ id: string; userId: string; displayName: string }> }> {
  return apiFetch(`/classroom/sections/${sectionId}/roster`);
}

export async function addStudent(
  sectionId: string,
  displayName: string,
): Promise<{ student: { id: string; userId: string; displayName: string; secretWords: string } }> {
  return apiFetch(`/classroom/sections/${sectionId}/students`, {
    method: 'POST',
    body: JSON.stringify({ displayName }),
  });
}

export async function lookupSection(code: string): Promise<{
  section: { code: string; name: string; students: Array<{ displayName: string }> };
}> {
  return apiFetch(`/classroom/join/${encodeURIComponent(code.toUpperCase())}`);
}

export async function studentSignIn(input: {
  code: string;
  displayName: string;
  secretWords: string;
}): Promise<{ ok: true; user: SessionUser }> {
  return apiFetch('/classroom/student/sign-in', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
