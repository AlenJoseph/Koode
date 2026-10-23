import { expect, test, type Page } from '@playwright/test';

const apiBase = process.env.API_ORIGIN ?? 'http://localhost:3001';
const bootstrapSecret = process.env.BOOTSTRAP_SECRET ?? 'dev-bootstrap-secret-16';

async function bootstrapAdmin(page: Page): Promise<string> {
  const reset = await page.request.post(`${apiBase}/admin/bootstrap/dev-reset`, {
    data: { bootstrapSecret },
  });
  expect(reset.ok()).toBeTruthy();
  const email = `e2e-gdpr-admin-${Date.now()}@example.com`;
  const bootstrap = await page.request.post(`${apiBase}/admin/bootstrap`, {
    data: { email, bootstrapSecret },
  });
  expect(bootstrap.ok()).toBeTruthy();
  const { devToken } = (await bootstrap.json()) as { devToken: string };
  const verified = await page.request.post(`${apiBase}/auth/magic-link/verify`, {
    data: { token: devToken },
  });
  expect(verified.ok()).toBeTruthy();
  return email;
}

async function createLearner(page: Page): Promise<{ userId: string; email: string }> {
  const email = `e2e-gdpr-learner-${Date.now()}@example.com`;
  const requested = await page.request.post(`${apiBase}/auth/magic-link/request`, {
    data: { email, intent: 'learner', ageConfirmed: true },
  });
  expect(requested.ok()).toBeTruthy();
  const { devToken } = (await requested.json()) as { devToken: string };
  const verified = await page.request.post(`${apiBase}/auth/magic-link/verify`, {
    data: { token: devToken },
  });
  expect(verified.ok()).toBeTruthy();
  const me = await page.request.get(`${apiBase}/auth/me`);
  expect(me.ok()).toBeTruthy();
  const { user } = (await me.json()) as { user: { id: string } };
  return { userId: user.id, email };
}

test.describe('E7-S2 admin learner export/delete', () => {
  test('happy: admin exports and deletes learner via API (UI-visible admin shell)', async ({
    page,
  }) => {
    await bootstrapAdmin(page);
    const learner = await createLearner(page);

    // Re-sign as admin after learner session overwrote cookies.
    await bootstrapAdmin(page);
    await page.goto('/en/admin');
    await expect(page.getByRole('heading', { name: 'Platform admin' })).toBeVisible();

    const exported = await page.request.get(`${apiBase}/admin/learners/${learner.userId}/export`);
    expect(exported.ok()).toBeTruthy();
    const payload = (await exported.json()) as {
      user: { id: string; role: string };
      emails: Array<{ email: string }>;
    };
    expect(payload.user.id).toBe(learner.userId);
    expect(payload.emails.some((e) => e.email === learner.email)).toBeTruthy();

    const deleted = await page.request.delete(`${apiBase}/admin/learners/${learner.userId}`);
    expect(deleted.ok()).toBeTruthy();

    const missing = await page.request.get(`${apiBase}/admin/learners/${learner.userId}/export`);
    expect(missing.status()).toBe(404);
  });

  test('negative: learner cannot export another learner', async ({ page }) => {
    const victim = await createLearner(page);
    const attackerEmail = `e2e-gdpr-attacker-${Date.now()}@example.com`;
    const requested = await page.request.post(`${apiBase}/auth/magic-link/request`, {
      data: { email: attackerEmail, intent: 'learner', ageConfirmed: true },
    });
    const { devToken } = (await requested.json()) as { devToken: string };
    await page.request.post(`${apiBase}/auth/magic-link/verify`, { data: { token: devToken } });

    const denied = await page.request.get(`${apiBase}/admin/learners/${victim.userId}/export`);
    expect(denied.status()).toBe(403);
  });
});
