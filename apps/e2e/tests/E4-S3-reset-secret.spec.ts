import { expect, test } from '@playwright/test';

test.describe('E4-S3 reset secret words', () => {
  test('happy: teacher resets secret words and sees new words once', async ({ page }) => {
    const email = `e2e-rs-teacher-${Date.now()}@example.com`;
    await page.goto('/en/sign-in');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await page.locator('a.dev-link').click();
    await expect(page).toHaveURL(/\/en\/?$/);

    await page.goto('/en/classroom');
    await page.getByLabel('Section name').fill('Secret UI lab');
    await page.getByRole('button', { name: 'Create section' }).click();
    await page.getByLabel('Student display name').fill('Neha');
    await page.getByRole('button', { name: 'Add student' }).click();

    const secretsLine = page.locator('p').filter({ hasText: 'Secret words (save for login card)' });
    await expect(secretsLine).toBeVisible();
    const firstSecrets = await secretsLine.textContent();
    expect(firstSecrets).toBeTruthy();

    await page.getByRole('button', { name: 'Reset secret words' }).click();
    await expect(secretsLine).not.toHaveText(firstSecrets!);
  });
});
