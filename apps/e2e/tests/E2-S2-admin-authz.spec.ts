import { expect, test, type Page } from '@playwright/test';

const apiBase = process.env.API_ORIGIN ?? 'http://localhost:3001';
const bootstrapSecret = process.env.BOOTSTRAP_SECRET ?? 'dev-bootstrap-secret-16';

async function signInWithIntent(
  page: Page,
  email: string,
  intent: 'teacher' | 'learner',
): Promise<void> {
  const requested = await page.request.post(`${apiBase}/auth/magic-link/request`, {
    data: {
      email,
      intent,
      ...(intent === 'learner' ? { ageConfirmed: true } : {}),
    },
  });
  expect(requested.ok()).toBeTruthy();
  const { devToken } = (await requested.json()) as { devToken: string };
  const verified = await page.request.post(`${apiBase}/auth/magic-link/verify`, {
    data: { token: devToken },
  });
  expect(verified.ok()).toBeTruthy();
}

test.describe('E2-S2 admin authz', () => {
  test('negative: learner cannot open admin shell', async ({ page }) => {
    await signInWithIntent(page, `e2e-authz-learner-${Date.now()}@example.com`, 'learner');
    await page.goto('/en/admin');
    await expect(page.getByText(/Admins only/i)).toBeVisible();
  });

  test('negative: teacher cannot open admin shell', async ({ page }) => {
    await signInWithIntent(page, `e2e-authz-teacher-${Date.now()}@example.com`, 'teacher');
    await page.goto('/en/admin');
    await expect(page.getByText(/Admins only/i)).toBeVisible();
  });

  test('happy: admin can open admin shell', async ({ page }) => {
    const reset = await page.request.post(`${apiBase}/admin/bootstrap/dev-reset`, {
      data: { bootstrapSecret },
    });
    expect(reset.ok()).toBeTruthy();

    const email = `e2e-authz-admin-${Date.now()}@example.com`;
    const bootstrap = await page.request.post(`${apiBase}/admin/bootstrap`, {
      data: { email, bootstrapSecret },
    });
    expect(bootstrap.ok()).toBeTruthy();
    const { devToken } = (await bootstrap.json()) as { devToken: string };

    const verified = await page.request.post(`${apiBase}/auth/magic-link/verify`, {
      data: { token: devToken },
    });
    expect(verified.ok()).toBeTruthy();

    await page.goto('/en/admin');
    await expect(page.getByRole('heading', { name: 'Platform admin' })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });
});
