import { expect, test } from '@playwright/test';

const apiBase = process.env.API_ORIGIN ?? 'http://localhost:3001';
const bootstrapSecret = process.env.BOOTSTRAP_SECRET ?? 'dev-bootstrap-secret-16';

test.describe('E2-S3 admin pathways', () => {
  test('happy: admin creates and archives a pathway in the UI', async ({ page }) => {
    const reset = await page.request.post(`${apiBase}/admin/bootstrap/dev-reset`, {
      data: { bootstrapSecret },
    });
    expect(reset.ok()).toBeTruthy();

    const email = `e2e-path-admin-${Date.now()}@example.com`;
    const bootstrap = await page.request.post(`${apiBase}/admin/bootstrap`, {
      data: { email, bootstrapSecret },
    });
    expect(bootstrap.ok()).toBeTruthy();
    const { devToken } = (await bootstrap.json()) as { devToken: string };
    const verified = await page.request.post(`${apiBase}/auth/magic-link/verify`, {
      data: { token: devToken },
    });
    expect(verified.ok()).toBeTruthy();

    // Clear leftover pathways from prior runs (list + archive).
    const listed = await page.request.get(`${apiBase}/admin/pathways?includeArchived=1`);
    expect(listed.ok()).toBeTruthy();
    const { pathways: existing } = (await listed.json()) as { pathways: Array<{ id: string }> };
    for (const row of existing) {
      await page.request.post(`${apiBase}/admin/pathways/${row.id}/archive`);
    }

    const title = `Pathway ${Date.now()}`;
    await page.goto('/en/admin');
    const pathwaysPanel = page.locator('div.panel').filter({
      has: page.getByRole('heading', { name: 'Pathways', exact: true }),
    });
    await expect(pathwaysPanel.getByRole('heading', { name: 'Pathways', exact: true })).toBeVisible();
    await pathwaysPanel.getByRole('textbox', { name: 'Title', exact: true }).fill(title);
    await pathwaysPanel.getByRole('textbox', { name: 'Summary', exact: true }).fill('E2E pathway summary');
    await pathwaysPanel.getByRole('button', { name: 'Create pathway' }).click();

    const row = page.getByRole('listitem').filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(row.getByText(/draft/i)).toBeVisible();

    await row.getByRole('button', { name: 'Publish' }).click();
    await expect(row.getByText(/published/i)).toBeVisible();

    await row.getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: title })).toHaveCount(0);
    await expect(page.getByText('No pathways yet.')).toBeVisible();
  });

  test('negative: learner cannot create pathways via API', async ({ page }) => {
    const email = `e2e-path-learner-${Date.now()}@example.com`;
    const requested = await page.request.post(`${apiBase}/auth/magic-link/request`, {
      data: { email, intent: 'learner', ageConfirmed: true },
    });
    const { devToken } = (await requested.json()) as { devToken: string };
    await page.request.post(`${apiBase}/auth/magic-link/verify`, {
      data: { token: devToken },
    });

    const create = await page.request.post(`${apiBase}/admin/pathways`, {
      data: { title: 'Should fail', summary: '', locale: 'en' },
    });
    expect(create.status()).toBe(403);
  });
});
