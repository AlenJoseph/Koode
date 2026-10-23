import { expect, test } from '@playwright/test';

test.describe('E1-S5 manage emails', () => {
  test('happy: learner can open home after signup (email already primary)', async ({ page }) => {
    const email = `e2e-mgmt-${Date.now()}@example.com`;
    await page.goto('/en/sign-up');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await page.locator('a.dev-link').click();
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.getByText(email)).toBeVisible();
    // Claim form only shows when no email — should be absent.
    await expect(page.getByRole('heading', { name: 'Link an email to this account' })).toHaveCount(
      0,
    );
  });

  test('negative: claim without session is not available on signed-out home', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { name: 'Link an email to this account' })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Learner sign up' }),
    ).toBeVisible();

  });
});
