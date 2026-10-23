import { expect, test } from '@playwright/test';

const landingOrigin = process.env.LANDING_ORIGIN ?? 'http://localhost:3002';

test.describe('E6-S1 SEO landing', () => {
  test.use({ baseURL: landingOrigin });

  test('happy: clear product page without org name-dropping', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Learn life skills/i);
    await expect(page.locator('h1')).toContainText(/Learn life skills\. Keep the thinking/i);
    await expect(page.getByRole('heading', { name: 'What you get' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pathways' })).toBeVisible();
    await expect(page.getByText('Know yourself')).toBeVisible();
    await expect(page.getByText('Make & serve')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Where we are (honest)' })).toBeVisible();

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/\bWHO\b/);
    expect(body).not.toMatch(/\bOECD\b/);
    expect(body).not.toMatch(/\bUNICEF\b/);
    expect(body).not.toMatch(/\bSDG\b/);
    expect(body.toLowerCase()).not.toContain('investable');
    expect(body).not.toContain('—');

    await expect(page.getByRole('link', { name: 'I’m a teacher' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'I’m a student' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join my class' })).toBeVisible();
  });
});
