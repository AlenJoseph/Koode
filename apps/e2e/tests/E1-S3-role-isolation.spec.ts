import { expect, test } from '@playwright/test';

test.describe('E1-S3 role isolation', () => {
  test('negative: learner email cannot use teacher sign-in successfully as teacher', async ({
    page,
  }) => {
    const email = `e2e-iso-${Date.now()}@example.com`;

    await page.goto('/en/sign-up');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel(/I confirm I am 13 or older/i).check();
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await page.locator('a.dev-link').click();
    await expect(page).toHaveURL(/\/en\/?$/);

    await page.goto('/en/sign-in');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await expect(page.locator('a.dev-link')).toBeVisible();
    await page.locator('a.dev-link').click();
    // Teacher intent on a learner email fails verify → failure copy.
    await expect(page.getByText(/invalid or expired|failed/i)).toBeVisible();
  });
});
