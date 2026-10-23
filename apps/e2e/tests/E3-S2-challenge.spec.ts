import { expect, test } from '@playwright/test';

const apiBase = process.env.API_ORIGIN ?? 'http://localhost:3001';
const bootstrapSecret = process.env.BOOTSTRAP_SECRET ?? 'dev-bootstrap-secret-16';

test.describe('E3-S2 challenge attempt', () => {
  test('happy: learner starts and completes a challenge', async ({ page }) => {
    const reset = await page.request.post(`${apiBase}/admin/bootstrap/dev-reset`, {
      data: { bootstrapSecret },
    });
    expect(reset.ok()).toBeTruthy();

    const adminEmail = `e2e-e3s2-admin-${Date.now()}@example.com`;
    const bootstrap = await page.request.post(`${apiBase}/admin/bootstrap`, {
      data: { email: adminEmail, bootstrapSecret },
    });
    const { devToken: adminToken } = (await bootstrap.json()) as { devToken: string };
    await page.request.post(`${apiBase}/auth/magic-link/verify`, {
      data: { token: adminToken },
    });

    const title = `E3 Challenge ${Date.now()}`;
    const created = await page.request.post(`${apiBase}/admin/challenges`, {
      data: { title, summary: 'Stub success', locale: 'en' },
    });
    const challengeId = ((await created.json()) as { challenge: { id: string } }).challenge.id;
    await page.request.patch(`${apiBase}/admin/challenges/${challengeId}`, {
      data: { status: 'published' },
    });
    await page.request.post(`${apiBase}/auth/logout`);

    const learnerEmail = `e2e-e3s2-learner-${Date.now()}@example.com`;
    await page.goto('/en/sign-up');
    await page.getByLabel('Email').fill(learnerEmail);
    await page.getByLabel(/I confirm I am 13 or older/i).check();
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await page.locator('a.dev-link').click();
    await expect(page).toHaveURL(/\/en\/?$/);

    await page.goto('/en/challenges');
    await expect(page.getByRole('heading', { name: 'Challenges' })).toBeVisible();
    const row = page.getByRole('listitem').filter({ hasText: title });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Start challenge' }).click();
    await row.getByRole('button', { name: 'Mark complete' }).click();
    await expect(row.getByText('Completed')).toBeVisible();
  });

  test('negative: unauthenticated challenges page prompts sign-in', async ({ page }) => {
    await page.goto('/en/challenges');
    await expect(page.getByText(/Sign in to try challenges/i)).toBeVisible();
  });
});
