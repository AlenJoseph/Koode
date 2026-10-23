import { expect, test } from '@playwright/test';

test.describe('E5-S2 R/O/G support legend', () => {
  test('happy: classroom insights show non-clinical legend copy', async ({ page }) => {
    const teacherEmail = `e2e-e5s2-${Date.now()}@example.com`;
    await page.goto('/en/sign-in');
    await page.getByLabel('Email').fill(teacherEmail);
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await page.locator('a.dev-link').click();
    await expect(page).toHaveURL(/\/en\/?$/);

    await page.goto('/en/classroom');
    await page.getByLabel('Section name').fill('Support signal lab');
    await page.getByRole('button', { name: 'Create section' }).click();

    await expect(page.getByRole('heading', { name: 'Learning support' })).toBeVisible();
    const legend = page.getByTestId('support-legend');
    await expect(legend).toBeVisible();
    await expect(legend).toContainText(/indicative support signal/i);
    await expect(legend).toContainText(/not a clinical diagnosis/i);
    await expect(page.getByText('Green — solid progress')).toBeVisible();
    await expect(page.getByText('Orange — watch / growing')).toBeVisible();
    await expect(page.getByText('Red — may need help')).toBeVisible();
  });
});
