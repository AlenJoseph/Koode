import { expect, test } from '@playwright/test';

test.describe('E4-S2 remove student', () => {
  test('happy: teacher removes student from roster in the UI', async ({ page }) => {
    const email = `e2e-rm-teacher-${Date.now()}@example.com`;
    await page.goto('/en/sign-in');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await page.locator('a.dev-link').click();
    await expect(page).toHaveURL(/\/en\/?$/);

    await page.goto('/en/classroom');
    await page.getByLabel('Section name').fill('Roster lab');
    await page.getByRole('button', { name: 'Create section' }).click();
    await expect(page.getByText(/Roster lab/)).toBeVisible();

    await page.getByLabel('Student display name').fill('Kabir');
    await page.getByRole('button', { name: 'Add student' }).click();
    await expect(page.getByText('Kabir')).toBeVisible();
    await expect(
      page.locator('p').filter({ hasText: /Secret words \(save for login card\)/i }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(page.getByText('Kabir')).toHaveCount(0);
  });
});
