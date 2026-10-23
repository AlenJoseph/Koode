import { expect, test } from '@playwright/test';

const apiBase = process.env.API_ORIGIN ?? 'http://localhost:3001';
const bootstrapSecret = process.env.BOOTSTRAP_SECRET ?? 'dev-bootstrap-secret-16';

test.describe('E3-S4 learner progress', () => {
  test('happy: progress page shows enrollments, attempts, and projects', async ({ page }) => {
    const reset = await page.request.post(`${apiBase}/admin/bootstrap/dev-reset`, {
      data: { bootstrapSecret },
    });
    expect(reset.ok()).toBeTruthy();

    const adminEmail = `e2e-e3s4-admin-${Date.now()}@example.com`;
    const bootstrap = await page.request.post(`${apiBase}/admin/bootstrap`, {
      data: { email: adminEmail, bootstrapSecret },
    });
    const { devToken: adminToken } = (await bootstrap.json()) as { devToken: string };
    await page.request.post(`${apiBase}/auth/magic-link/verify`, {
      data: { token: adminToken },
    });

    const pathwayTitle = `Prog path ${Date.now()}`;
    const pathway = await page.request.post(`${apiBase}/admin/pathways`, {
      data: { title: pathwayTitle, summary: '', locale: 'en' },
    });
    const pathwayId = ((await pathway.json()) as { pathway: { id: string } }).pathway.id;
    await page.request.patch(`${apiBase}/admin/pathways/${pathwayId}`, {
      data: { status: 'published' },
    });

    const challengeTitle = `Prog challenge ${Date.now()}`;
    const challenge = await page.request.post(`${apiBase}/admin/challenges`, {
      data: { title: challengeTitle, summary: '', locale: 'en', pathwayId },
    });
    const challengeId = ((await challenge.json()) as { challenge: { id: string } }).challenge.id;
    await page.request.patch(`${apiBase}/admin/challenges/${challengeId}`, {
      data: { status: 'published' },
    });
    await page.request.post(`${apiBase}/auth/logout`);

    const learnerEmail = `e2e-e3s4-learner-${Date.now()}@example.com`;
    const requested = await page.request.post(`${apiBase}/auth/magic-link/request`, {
      data: { email: learnerEmail, intent: 'learner', ageConfirmed: true },
    });
    const { devToken } = (await requested.json()) as { devToken: string };
    await page.request.post(`${apiBase}/auth/magic-link/verify`, {
      data: { token: devToken },
    });

    await page.request.post(`${apiBase}/pathways/${pathwayId}/enroll`);
    const attemptRes = await page.request.post(`${apiBase}/challenges/${challengeId}/attempts`);
    const attemptId = ((await attemptRes.json()) as { attempt: { id: string } }).attempt.id;
    await page.request.post(`${apiBase}/challenges/attempts/${attemptId}/complete`);

    const projectTitle = `Prog project ${Date.now()}`;
    await page.request.post(`${apiBase}/projects`, {
      data: {
        title: projectTitle,
        summary: 'From progress e2e',
        pathwayId,
        challengeId,
      },
    });

    await page.goto('/en/progress');
    await expect(page.getByRole('heading', { name: 'Your progress' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pathway enrollments' })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: `${pathwayTitle} · active` })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Challenge attempts' })).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: `${challengeTitle} · completed` }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
    await expect(page.getByText(`${projectTitle} — From progress e2e`)).toBeVisible();
  });

  test('negative: signed-out visitor is prompted to sign in', async ({ page }) => {
    await page.goto('/en/progress');
    await expect(page.getByText(/Sign in to see your progress/i)).toBeVisible();
  });
});
