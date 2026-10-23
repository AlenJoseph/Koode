import { expect, test } from '@playwright/test';

const apiBase = process.env.API_ORIGIN ?? 'http://localhost:3001';
const bootstrapSecret = process.env.BOOTSTRAP_SECRET ?? 'dev-bootstrap-secret-16';

test.describe('E2-S1 admin bootstrap', () => {
  test.beforeEach(async ({ request }) => {
    const reset = await request.post(`${apiBase}/admin/bootstrap/dev-reset`, {
      data: { bootstrapSecret },
    });
    expect(reset.ok()).toBeTruthy();
  });

  test('happy: bootstrap admin via UI and land signed in as admin', async ({ page }) => {
    const email = `e2e-admin-${Date.now()}@example.com`;
    await page.goto('/en/admin/bootstrap');
    await expect(page.getByRole('heading', { name: 'Create the first platform admin' })).toBeVisible();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Bootstrap secret').fill(bootstrapSecret);
    await page.getByRole('button', { name: 'Create admin' }).click();
    await expect(page.getByText('Admin created')).toBeVisible();
    await page.locator('a.dev-link').click();
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.getByText(email)).toBeVisible();
  });

  test('negative: wrong bootstrap secret shows error', async ({ page }) => {
    await page.goto('/en/admin/bootstrap');
    await page.getByLabel('Email').fill(`e2e-bad-${Date.now()}@example.com`);
    await page.getByLabel('Bootstrap secret').fill('definitely-wrong-secret');
    await page.getByRole('button', { name: 'Create admin' }).click();
    await expect(page.getByText(/Bootstrap failed|already exists/i)).toBeVisible();
  });
});
