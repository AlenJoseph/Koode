import { expect, test } from '@playwright/test';

const docsOrigin = process.env.DOCS_ORIGIN ?? 'http://localhost:3003';

test.describe('E6-S2 docs site shell', () => {
  test.use({ baseURL: docsOrigin });

  test('happy: home links architecture, requirements, epics', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Koode documentation' })).toBeVisible();

    await page.getByRole('link', { name: 'Architecture', exact: true }).first().click();
    await expect(page).toHaveURL(/\/architecture$/);
    await expect(page.locator('article')).toContainText(/architecture/i);

    await page.getByRole('link', { name: 'Requirements', exact: true }).first().click();
    await expect(page).toHaveURL(/\/requirements$/);
    await expect(page.locator('article')).toContainText(/requirement/i);

    await page.getByRole('link', { name: 'Epics', exact: true }).first().click();
    await expect(page).toHaveURL(/\/epics$/);
    await expect(page.locator('article')).toContainText(/Epic/i);
  });

  test('negative: unknown slug is not found', async ({ page }) => {
    const response = await page.goto('/does-not-exist');
    expect(response?.status()).toBe(404);
  });
});
