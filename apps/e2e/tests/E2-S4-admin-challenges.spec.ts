import { expect, test } from '@playwright/test';

const apiBase = process.env.API_ORIGIN ?? 'http://localhost:3001';
const bootstrapSecret = process.env.BOOTSTRAP_SECRET ?? 'dev-bootstrap-secret-16';

test.describe('E2-S4 admin challenges', () => {
  test('happy: admin creates challenge linked to pathway and archives it', async ({ page }) => {
    const reset = await page.request.post(`${apiBase}/admin/bootstrap/dev-reset`, {
      data: { bootstrapSecret },
    });
    expect(reset.ok()).toBeTruthy();

    const email = `e2e-chal-admin-${Date.now()}@example.com`;
    const bootstrap = await page.request.post(`${apiBase}/admin/bootstrap`, {
      data: { email, bootstrapSecret },
    });
    expect(bootstrap.ok()).toBeTruthy();
    const { devToken } = (await bootstrap.json()) as { devToken: string };
    const verified = await page.request.post(`${apiBase}/auth/magic-link/verify`, {
      data: { token: devToken },
    });
    expect(verified.ok()).toBeTruthy();

    for (const row of (
      (await (await page.request.get(`${apiBase}/admin/challenges?includeArchived=1`)).json()) as {
        challenges: Array<{ id: string }>;
      }
    ).challenges) {
      await page.request.post(`${apiBase}/admin/challenges/${row.id}/archive`);
    }
    for (const row of (
      (await (await page.request.get(`${apiBase}/admin/pathways?includeArchived=1`)).json()) as {
        pathways: Array<{ id: string }>;
      }
    ).pathways) {
      await page.request.post(`${apiBase}/admin/pathways/${row.id}/archive`);
    }

    const pathwayTitle = `Parent ${Date.now()}`;
    const pathway = await page.request.post(`${apiBase}/admin/pathways`, {
      data: { title: pathwayTitle, summary: 'parent', locale: 'en' },
    });
    expect(pathway.ok()).toBeTruthy();

    const title = `Challenge ${Date.now()}`;
    await page.goto('/en/admin');
    await expect(page.getByRole('heading', { name: 'Challenges' })).toBeVisible();
    await page.getByLabel('Challenge title').fill(title);
    await page.getByLabel('Challenge summary').fill('E2E challenge summary');
    await page.getByLabel('Linked pathway').selectOption({ label: pathwayTitle });
    await page.getByRole('button', { name: 'Create challenge' }).click();

    const row = page.getByRole('listitem').filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(row.getByText(pathwayTitle)).toBeVisible();
    await expect(row.getByText(/draft/i)).toBeVisible();

    await row.getByRole('button', { name: 'Publish challenge' }).click();
    await expect(row.getByText(/published/i)).toBeVisible();

    await row.getByRole('button', { name: 'Archive challenge' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: title })).toHaveCount(0);
    await expect(page.getByText('No challenges yet.')).toBeVisible();
  });

  test('negative: learner cannot create challenges via API', async ({ page }) => {
    const email = `e2e-chal-learner-${Date.now()}@example.com`;
    const requested = await page.request.post(`${apiBase}/auth/magic-link/request`, {
      data: { email, intent: 'learner' },
    });
    const { devToken } = (await requested.json()) as { devToken: string };
    await page.request.post(`${apiBase}/auth/magic-link/verify`, {
      data: { token: devToken },
    });

    const create = await page.request.post(`${apiBase}/admin/challenges`, {
      data: { title: 'Should fail', summary: '', locale: 'en' },
    });
    expect(create.status()).toBe(403);
  });
});
