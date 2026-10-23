import { expect, type APIRequestContext, type Page } from '@playwright/test';

const apiBase = process.env.API_ORIGIN ?? 'http://localhost:3001';

/** Independent learner via UI (age gate required). */
export async function learnerSignUpUi(page: Page, email: string): Promise<void> {
  await page.goto('/en/sign-up');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/I confirm I am 13 or older/i).check();
  await page.getByRole('button', { name: 'Send magic link' }).click();
  const verifyLink = page.locator('a.dev-link');
  await expect(verifyLink).toBeVisible();
  await verifyLink.click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await expect(page.locator('.topbar-user')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Home' }).getByText(email)).toBeVisible();
}

/** Teacher via UI magic link. */
export async function teacherSignInUi(page: Page, email: string): Promise<void> {
  await page.goto('/en/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send magic link' }).click();
  const verifyLink = page.locator('a.dev-link');
  await expect(verifyLink).toBeVisible();
  await verifyLink.click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await expect(page.locator('.topbar-user')).toBeVisible();
}

/** API magic-link session (sets cookie on the request context / page). */
export async function magicLinkSession(
  request: APIRequestContext,
  email: string,
  intent: 'teacher' | 'learner',
): Promise<void> {
  const requested = await request.post(`${apiBase}/auth/magic-link/request`, {
    data: {
      email,
      intent,
      ...(intent === 'learner' ? { ageConfirmed: true } : {}),
    },
  });
  expect(requested.ok()).toBeTruthy();
  const { devToken } = (await requested.json()) as { devToken: string };
  const verified = await request.post(`${apiBase}/auth/magic-link/verify`, {
    data: { token: devToken },
  });
  expect(verified.ok()).toBeTruthy();
}
