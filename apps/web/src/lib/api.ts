import type {
  Challenge,
  Pathway,
  SessionUser,
  TutorTurnRequest,
  TutorTurnResponse,
} from '@koode/contracts';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined && init.body !== null;
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
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

export async function getBootstrapStatus(): Promise<{
  bootstrapped: boolean;
  bootstrapEnabled: boolean;
}> {
  return apiFetch('/admin/bootstrap/status');
}

export async function bootstrapAdmin(
  email: string,
  bootstrapSecret: string,
): Promise<{
  ok: true;
  email: string;
  userId: string;
  devToken?: string;
  devVerifyUrl?: string;
}> {
  return apiFetch('/admin/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ email, bootstrapSecret }),
  });
}

export type AdminPathway = Pathway;

export async function listAdminPathways(): Promise<{ pathways: AdminPathway[] }> {
  return apiFetch('/admin/pathways');
}

export async function createAdminPathway(input: {
  title: string;
  summary: string;
}): Promise<{ pathway: AdminPathway }> {
  return apiFetch('/admin/pathways', {
    method: 'POST',
    body: JSON.stringify({ ...input, locale: 'en' }),
  });
}

export async function updateAdminPathway(
  pathwayId: string,
  input: { title?: string; summary?: string; status?: 'draft' | 'published' },
): Promise<{ pathway: AdminPathway }> {
  return apiFetch(`/admin/pathways/${pathwayId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function archiveAdminPathway(
  pathwayId: string,
): Promise<{ pathway: AdminPathway }> {
  return apiFetch(`/admin/pathways/${pathwayId}/archive`, {
    method: 'POST',
  });
}

export type AdminChallenge = Challenge;

export async function listAdminChallenges(): Promise<{ challenges: AdminChallenge[] }> {
  return apiFetch('/admin/challenges');
}

export async function createAdminChallenge(input: {
  title: string;
  summary: string;
  pathwayId?: string | null;
}): Promise<{ challenge: AdminChallenge }> {
  return apiFetch('/admin/challenges', {
    method: 'POST',
    body: JSON.stringify({ ...input, locale: 'en' }),
  });
}

export async function updateAdminChallenge(
  challengeId: string,
  input: {
    title?: string;
    summary?: string;
    status?: 'draft' | 'published';
    pathwayId?: string | null;
  },
): Promise<{ challenge: AdminChallenge }> {
  return apiFetch(`/admin/challenges/${challengeId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function archiveAdminChallenge(
  challengeId: string,
): Promise<{ challenge: AdminChallenge }> {
  return apiFetch(`/admin/challenges/${challengeId}/archive`, {
    method: 'POST',
  });
}

export type LearnerPathway = {
  id: string;
  title: string;
  summary: string;
  locale: string;
  status: string;
};

export type PathwayEnrollment = {
  id: string;
  pathwayId: string;
  status: string;
  startedAt: string;
};

export async function listLearnerPathways(): Promise<{ pathways: LearnerPathway[] }> {
  return apiFetch('/pathways');
}

export async function listMyPathwayEnrollments(): Promise<{ enrollments: PathwayEnrollment[] }> {
  return apiFetch('/pathways/enrollments');
}

export async function enrollInPathway(
  pathwayId: string,
): Promise<{ enrollment: PathwayEnrollment }> {
  return apiFetch(`/pathways/${pathwayId}/enroll`, { method: 'POST' });
}

export type LearnerChallenge = {
  id: string;
  title: string;
  summary: string;
  locale: string;
  status: string;
  pathwayId: string | null;
};

export type ChallengeAttempt = {
  id: string;
  challengeId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
};

export async function listLearnerChallenges(): Promise<{ challenges: LearnerChallenge[] }> {
  return apiFetch('/challenges');
}

export async function listMyChallengeAttempts(): Promise<{ attempts: ChallengeAttempt[] }> {
  return apiFetch('/challenges/attempts');
}

export async function startChallengeAttempt(
  challengeId: string,
): Promise<{ attempt: ChallengeAttempt }> {
  return apiFetch(`/challenges/${challengeId}/attempts`, { method: 'POST' });
}

export async function completeChallengeAttempt(
  attemptId: string,
): Promise<{ attempt: ChallengeAttempt }> {
  return apiFetch(`/challenges/attempts/${attemptId}/complete`, { method: 'POST' });
}

export type LearnerProject = {
  id: string;
  title: string;
  summary: string;
  pathwayId: string | null;
  challengeId: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listMyProjects(): Promise<{ projects: LearnerProject[] }> {
  return apiFetch('/projects');
}

export async function createProject(input: {
  title: string;
  summary?: string;
  pathwayId?: string | null;
  challengeId?: string | null;
}): Promise<{ project: LearnerProject }> {
  return apiFetch('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateProject(
  projectId: string,
  input: {
    title?: string;
    summary?: string;
    pathwayId?: string | null;
    challengeId?: string | null;
  },
): Promise<{ project: LearnerProject }> {
  return apiFetch(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** null = signed out; 'forbidden' = signed in but not admin. */
export async function fetchAdminMe(): Promise<
  { user: SessionUser } | null | 'forbidden'
> {
  const response = await fetch(`${apiBase}/admin/me`, {
    credentials: 'include',
  });
  if (response.status === 401) {
    return null;
  }
  if (response.status === 403) {
    return 'forbidden';
  }
  if (!response.ok) {
    throw new Error(`API /admin/me failed with ${response.status}`);
  }
  return (await response.json()) as { user: SessionUser };
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

export type ClassroomSection = {
  id: string;
  name: string;
  code: string;
  archivedAt?: string | null;
};

export async function exportRosterCsv(sectionId: string): Promise<Blob> {
  const response = await fetch(
    `${apiBase}/classroom/sections/${sectionId}/export?format=csv`,
    { credentials: 'include' },
  );
  if (!response.ok) {
    throw new Error(`API export failed with ${response.status}`);
  }
  return response.blob();
}

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

export async function removeStudent(sectionId: string, membershipId: string): Promise<{ ok: true }> {
  return apiFetch(`/classroom/sections/${sectionId}/students/${membershipId}`, {
    method: 'DELETE',
  });
}

export async function resetStudentSecret(
  sectionId: string,
  membershipId: string,
): Promise<{ student: { id: string; userId: string; displayName: string; secretWords: string } }> {
  return apiFetch(`/classroom/sections/${sectionId}/students/${membershipId}/reset-secret`, {
    method: 'POST',
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
