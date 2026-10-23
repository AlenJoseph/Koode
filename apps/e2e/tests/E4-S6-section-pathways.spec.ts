import { expect, test } from '@playwright/test';

const apiBase = process.env.API_ORIGIN ?? 'http://localhost:3001';
const bootstrapSecret = process.env.BOOTSTRAP_SECRET ?? 'dev-bootstrap-secret-16';

test.describe('E4-S6 section pathway direction', () => {
  test('happy: teacher saves pathway direction for a section', async ({ page }) => {
    const reset = await page.request.post(`${apiBase}/admin/bootstrap/dev-reset`, {
      data: { bootstrapSecret },
    });
    expect(reset.ok()).toBeTruthy();

    const adminEmail = `e2e-dir-admin-${Date.now()}@example.com`;
    const bootstrap = await page.request.post(`${apiBase}/admin/bootstrap`, {
      data: { email: adminEmail, bootstrapSecret },
    });
    const { devToken: adminToken } = (await bootstrap.json()) as { devToken: string };
    await page.request.post(`${apiBase}/auth/magic-link/verify`, {
      data: { token: adminToken },
    });

    const pathwayTitle = `Direction ${Date.now()}`;
    const created = await page.request.post(`${apiBase}/admin/pathways`, {
      data: { title: pathwayTitle, summary: 'Guidance', locale: 'en' },
    });
    const pathwayId = ((await created.json()) as { pathway: { id: string } }).pathway.id;
    await page.request.patch(`${apiBase}/admin/pathways/${pathwayId}`, {
      data: { status: 'published' },
    });
    await page.request.post(`${apiBase}/auth/logout`);

    const teacherEmail = `e2e-dir-teacher-${Date.now()}@example.com`;
    await page.goto('/en/sign-in');
    await page.getByLabel('Email').fill(teacherEmail);
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await page.locator('a.dev-link').click();
    await expect(page).toHaveURL(/\/en\/?$/);

    await page.goto('/en/classroom');
    await page.getByLabel('Section name').fill('Direction lab');
    await page.getByRole('button', { name: 'Create section' }).click();
    await expect(page.getByRole('heading', { name: 'Pathway direction' })).toBeVisible();
    await page.getByLabel(pathwayTitle).check();
    await page.getByRole('button', { name: 'Save pathway direction' }).click();
    await expect(page.getByText('Pathway direction saved.')).toBeVisible();
  });
});
