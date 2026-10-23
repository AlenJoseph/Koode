import { expect, test } from '@playwright/test';

test.describe('E7-S3 age gate copy (13–18)', () => {
  test('happy: sign-up shows age expectation and requires confirm', async ({ page }) => {
    await page.goto('/en/sign-up');
    await expect(page.getByRole('heading', { name: 'Learner sign up' })).toBeVisible();
    await expect(page.getByTestId('age-gate')).toContainText(/13–18|13-18/);
    await expect(page.getByTestId('age-gate')).toContainText(/no under-13/i);
    await expect(page.getByLabel(/I confirm I am 13 or older/i)).toBeVisible();

    const send = page.getByRole('button', { name: 'Send magic link' });
    await expect(send).toBeDisabled();

    await page.getByLabel('Email').fill(`e2e-age-${Date.now()}@example.com`);
    await page.getByLabel(/I confirm I am 13 or older/i).check();
    await expect(send).toBeEnabled();
  });

  test('negative: without age confirm, submit stays blocked', async ({ page }) => {
    await page.goto('/en/sign-up');
    await page.getByLabel('Email').fill(`e2e-age-blocked-${Date.now()}@example.com`);
    await expect(page.getByRole('button', { name: 'Send magic link' })).toBeDisabled();
    await expect(page.locator('a.dev-link')).toHaveCount(0);
  });
});
