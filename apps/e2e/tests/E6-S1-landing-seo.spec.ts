import { expect, test } from '@playwright/test';

const landingOrigin = process.env.LANDING_ORIGIN ?? 'http://localhost:3002';

test.describe('E6-S1 SEO landing', () => {
  test.use({ baseURL: landingOrigin });

  test('happy: indexable title, h1, meta, and three CTAs', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Personal intelligence for human growth/i);
    await expect(page.locator('h1')).toContainText(/Learn life\. Practise judgement/i);
    await expect(page.getByRole('heading', { name: 'Worlds you can chase' })).toBeVisible();
    await expect(page.getByText(/Wildlife & habitats/i)).toBeVisible();
    await expect(page.getByText(/First aid & calm under pressure/i)).toBeVisible();
    await expect(page.getByText(/Software when it helps/i)).toBeVisible();

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /life skills|first aid|wildlife/i);

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /human growth/i);

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
