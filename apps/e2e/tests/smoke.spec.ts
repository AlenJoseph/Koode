import { expect, test } from '@playwright/test';

test.describe('locale smoke', () => {
  test('home loads in English and Malayalam', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { name: 'Koode' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();

    await page.goto('/ml');
    await expect(page.getByRole('heading', { name: 'കൂടെ' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ക്ലാസിൽ ചേരുക' })).toBeVisible();
  });

  test('join page is reachable without auth', async ({ page }) => {
    await page.goto('/en/join');
    await expect(page.getByRole('heading', { name: 'Join your class' })).toBeVisible();
    await expect(page.getByLabel('Section code')).toBeVisible();
  });
});
