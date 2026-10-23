import { expect, test } from '@playwright/test';

const landingOrigin = process.env.LANDING_ORIGIN ?? 'http://localhost:3002';

test.describe('E6-S1 SEO landing', () => {
  test.use({ baseURL: landingOrigin });

  test('happy: product clarity, SDGs, CTAs, no em dash sell copy', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Personal intelligence for human growth/i);
    await expect(page.locator('h1')).toContainText(/Personal intelligence for human growth/i);
    await expect(page.getByRole('heading', { name: 'What Koode is' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Aligned with the UN Sustainable Development Goals/i }),
    ).toBeVisible();
    await expect(page.getByText('SDG 4')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Why this is investable' })).toBeVisible();
    await expect(page.getByText(/Wildlife protection/i)).toBeVisible();
    await expect(page.getByText(/Software when it helps/i)).toBeVisible();

    const body = await page.locator('body').innerText();
    expect(body).not.toContain('—');

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /UN SDG|life skills/i);

    await expect(page.getByRole('link', { name: 'I’m a teacher' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'I’m a student' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join my class' })).toBeVisible();
  });
});
