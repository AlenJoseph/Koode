import { expect, test } from '@playwright/test';

const landingOrigin = process.env.LANDING_ORIGIN ?? 'http://localhost:3002';

test.describe('E6-S1 SEO landing', () => {
  test.use({ baseURL: landingOrigin });

  test('happy: indexable title, h1, meta, and three CTAs', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Koode/i);
    await expect(page.locator('h1')).toContainText(/Learn coding like a game/i);

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /Pathways, challenges/i);

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /Koode/i);

    await expect(page.getByRole('link', { name: 'I’m a teacher' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'I’m learning alone' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join my class' })).toBeVisible();

    const teacherHref = await page.getByRole('link', { name: 'I’m a teacher' }).getAttribute('href');
    expect(teacherHref).toMatch(/\/en\/sign-in$/);
    const learnerHref = await page
      .getByRole('link', { name: 'I’m learning alone' })
      .getAttribute('href');
    expect(learnerHref).toMatch(/\/en\/sign-up$/);
    const joinHref = await page.getByRole('link', { name: 'Join my class' }).getAttribute('href');
    expect(joinHref).toMatch(/\/en\/join$/);
  });
});
