import { expect, test } from '@playwright/test';

const apiBase = process.env.API_ORIGIN ?? 'http://localhost:3001';
const bootstrapSecret = process.env.BOOTSTRAP_SECRET ?? 'dev-bootstrap-secret-16';

test.describe('E3-S3 project stub', () => {
  test('happy: learner saves a project linked to a pathway', async ({ page }) => {
    const reset = await page.request.post(`${apiBase}/admin/bootstrap/dev-reset`, {
      data: { bootstrapSecret },
    });
    expect(reset.ok()).toBeTruthy();

    const adminEmail = `e2e-e3s3-admin-${Date.now()}@example.com`;
    const bootstrap = await page.request.post(`${apiBase}/admin/bootstrap`, {
      data: { email: adminEmail, bootstrapSecret },
    });
    const { devToken: adminToken } = (await bootstrap.json()) as { devToken: string };
    await page.request.post(`${apiBase}/auth/magic-link/verify`, {
      data: { token: adminToken },
    });

    const pathwayTitle = `Project path ${Date.now()}`;
    const pathway = await page.request.post(`${apiBase}/admin/pathways`, {
      data: { title: pathwayTitle, summary: '', locale: 'en' },
    });
    const pathwayId = ((await pathway.json()) as { pathway: { id: string } }).pathway.id;
    await page.request.patch(`${apiBase}/admin/pathways/${pathwayId}`, {
      data: { status: 'published' },
    });
    await page.request.post(`${apiBase}/auth/logout`);

    const learnerEmail = `e2e-e3s3-learner-${Date.now()}@example.com`;
    await page.goto('/en/sign-up');
    await page.getByLabel('Email').fill(learnerEmail);
    await page.getByLabel(/I confirm I am 13 or older/i).check();
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await page.locator('a.dev-link').click();
    await expect(page).toHaveURL(/\/en\/?$/);

    const projectTitle = `My project ${Date.now()}`;
    await page.goto('/en/progress');
    await expect(page.getByRole('heading', { name: 'Your projects' })).toBeVisible();
    await page.getByLabel('Project title').fill(projectTitle);
    await page.getByLabel('Project summary').fill('E2E project summary');
    await page.getByLabel('Linked pathway').selectOption({ label: pathwayTitle });
    await page.getByRole('button', { name: 'Save project' }).click();
    await expect(page.getByText(projectTitle)).toBeVisible();
    await expect(page.getByText('E2E project summary')).toBeVisible();
  });

  test('negative: signed-out visitor is prompted to sign in', async ({ page }) => {
    await page.goto('/en/progress');
    await expect(page.getByText(/Sign in to see your progress|Sign in to save projects/i)).toBeVisible();
  });
});
