import { expect, test } from '@playwright/test';

const landingOrigin = process.env.LANDING_ORIGIN ?? 'http://localhost:3002';

test.describe('E6-S1 SEO landing', () => {
  test.use({ baseURL: landingOrigin });

  test('happy: product clarity, research pathways, SDGs, no investor pitch', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Personal intelligence for human growth/i);
    await expect(page.locator('h1')).toContainText(/Personal intelligence for human growth/i);
    await expect(page.getByRole('heading', { name: 'What Koode is' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pathways students can chase' })).toBeVisible();
    await expect(page.getByText('Know yourself')).toBeVisible();
    await expect(page.getByText('Living world')).toBeVisible();
    await expect(page.getByText('Make & serve')).toBeVisible();
    await expect(page.getByText(/Anticipate → Act → Reflect/i)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Connected to the UN Sustainable Development Goals/i }),
    ).toBeVisible();

    await expect(page.getByRole('heading', { name: /invest/i })).toHaveCount(0);
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).not.toContain('investable');
    expect(body).not.toContain('—');

    await expect(page.getByRole('link', { name: 'I’m a teacher' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'I’m a student' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join my class' })).toBeVisible();
  });
});
