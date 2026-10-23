import { expect, test } from '@playwright/test';

test.describe('E1-S2 independent learner signup', () => {
  test('happy: learner signs up, lands home, can open tutor', async ({ page }) => {
    const email = `e2e-learner-${Date.now()}@example.com`;

    await page.goto('/en/sign-up');
    await expect(page.getByRole('heading', { name: 'Learner sign up' })).toBeVisible();
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send magic link' }).click();

    const verifyLink = page.locator('a.dev-link');
    await expect(verifyLink).toBeVisible();
    await verifyLink.click();
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.getByText(email)).toBeVisible();

    await page.goto('/en/tutor');
    await expect(page.getByRole('heading', { name: 'Guided tutor' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ask Koode' })).toBeVisible();
  });

  test('negative: garbage verify token shows failure', async ({ page }) => {
    await page.goto('/en/auth/verify?token=this-token-is-long-enough-but-invalidxx');
    await expect(page.getByText(/invalid or expired/i)).toBeVisible();
  });
});
