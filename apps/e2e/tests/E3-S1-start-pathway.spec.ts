import { expect, test } from '@playwright/test';

const apiBase = process.env.API_ORIGIN ?? 'http://localhost:3001';
const bootstrapSecret = process.env.BOOTSTRAP_SECRET ?? 'dev-bootstrap-secret-16';

test.describe('E3-S1 start pathway', () => {
  test('happy: learner browses published pathway and starts enrollment', async ({ page }) => {
    const reset = await page.request.post(`${apiBase}/admin/bootstrap/dev-reset`, {
      data: { bootstrapSecret },
    });
    expect(reset.ok()).toBeTruthy();

    const adminEmail = `e2e-e3s1-admin-${Date.now()}@example.com`;
    const bootstrap = await page.request.post(`${apiBase}/admin/bootstrap`, {
      data: { email: adminEmail, bootstrapSecret },
    });
    const { devToken: adminToken } = (await bootstrap.json()) as { devToken: string };
    await page.request.post(`${apiBase}/auth/magic-link/verify`, {
      data: { token: adminToken },
    });

    const title = `E3 Pathway ${Date.now()}`;
    const created = await page.request.post(`${apiBase}/admin/pathways`, {
      data: { title, summary: 'Day-1 loop', locale: 'en' },
    });
    expect(created.ok()).toBeTruthy();
    const pathwayId = ((await created.json()) as { pathway: { id: string } }).pathway.id;
    const published = await page.request.patch(`${apiBase}/admin/pathways/${pathwayId}`, {
      data: { status: 'published' },
    });
    expect(published.ok()).toBeTruthy();

    await page.request.post(`${apiBase}/auth/logout`);

    const learnerEmail = `e2e-e3s1-learner-${Date.now()}@example.com`;
    await page.goto('/en/sign-up');
    await page.getByLabel('Email').fill(learnerEmail);
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await page.locator('a.dev-link').click();
    await expect(page).toHaveURL(/\/en\/?$/);

    await page.goto('/en/pathways');
    await expect(page.getByRole('heading', { name: 'Learning pathways' })).toBeVisible();
    const row = page.getByRole('listitem').filter({ hasText: title });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Start pathway' }).click();
    await expect(row.getByText('Started')).toBeVisible();
  });

  test('negative: signed-out visitor is prompted to sign in', async ({ page }) => {
    await page.goto('/en/pathways');
    await expect(page.getByText(/Sign in to browse/i)).toBeVisible();
  });
});
