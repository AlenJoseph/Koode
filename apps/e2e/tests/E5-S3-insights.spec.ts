import { expect, test } from '@playwright/test';

test.describe('E5-S3 teacher insights page', () => {
  test('happy: graphs render for a section; no raw chat content', async ({ page }) => {
    const teacherEmail = `e2e-e5s3-${Date.now()}@example.com`;
    await page.goto('/en/sign-in');
    await page.getByLabel('Email').fill(teacherEmail);
    await page.getByRole('button', { name: 'Send magic link' }).click();
    await page.locator('a.dev-link').click();
    await expect(page).toHaveURL(/\/en\/?$/);

    await page.goto('/en/classroom');
    await page.getByLabel('Section name').fill('Insights graphs lab');
    await page.getByRole('button', { name: 'Create section' }).click();
    await page.getByLabel('Student display name').fill('Nila');
    await page.getByRole('button', { name: 'Add student' }).click();
    await expect(page.getByText('Secret words (save for login card)')).toBeVisible();

    await page.goto('/en/insights');
    await expect(page.getByTestId('insights-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Teacher insights' })).toBeVisible();
    await expect(page.getByTestId('learning-support-graph')).toBeVisible();
    await expect(page.getByTestId('bar-helpNeeded')).toBeVisible();
    await expect(page.getByText('Help needed')).toBeVisible();
    await expect(page.getByTestId('insights-support-legend')).toContainText(
      /not a clinical diagnosis/i,
    );

    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).not.toContain('learner message');
    expect(body.toLowerCase()).not.toContain('chat transcript');
    expect(body.toLowerCase()).not.toContain('guiding question');
  });
});
