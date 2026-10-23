import { expect, test } from '@playwright/test';

test.describe('E4-S5 roster export', () => {
  test('happy: teacher downloads roster CSV', async ({ page }) => {
    const email = `e2e-ex-teacher-${Date.now()}@example.com`;
    await page.goto('/en/sign-in');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await page.locator('a.dev-link').click();
    await expect(page).toHaveURL(/\/en\/?$/);

    await page.goto('/en/classroom');
    await page.getByLabel('Section name').fill('Export UI');
    await page.getByRole('button', { name: 'Create section' }).click();
    await page.getByLabel('Student display name').fill('Zara');
    await page.getByRole('button', { name: 'Add student' }).click();
    await expect(page.getByText('Zara')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download roster CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^roster-[A-Z2-9]{6}\.csv$/);
    const path = await download.path();
    expect(path).toBeTruthy();
  });
});
