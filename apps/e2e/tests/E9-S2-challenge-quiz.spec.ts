import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiBase = process.env.API_ORIGIN ?? 'http://localhost:3001';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test.describe('E9-S2 challenge quiz', () => {
  test.beforeAll(() => {
    execFileSync('pnpm', ['db:seed'], { cwd: repoRoot, stdio: 'pipe', env: process.env });
  });

  test('happy: learner answers seeded quiz and sees score', async ({ page }) => {
    const learnerEmail = `e2e-quiz-${Date.now()}@example.com`;
    await page.goto('/en/sign-up');
    await page.getByLabel('Email').fill(learnerEmail);
    await page.getByLabel(/I confirm I am 13 or older/i).check();
    await page.getByRole('button', { name: 'Send magic link' }).click();
    const verifyLink = page.locator('a.dev-link');
    await expect(verifyLink).toBeVisible();
    await verifyLink.click();
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.locator('.topbar-user')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Home' }).getByText(learnerEmail)).toBeVisible();

    await page.goto('/en/challenges');
    await expect(page.getByRole('heading', { name: 'Challenges' })).toBeVisible();
    await expect(page.getByText(/Sign in to try challenges/i)).toHaveCount(0);

    const card = page.locator('[data-challenge-slug="pause-before-react"]');
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click();
    await expect(page).toHaveURL(/\/en\/challenges\/[0-9a-f-]+/);

    await page.getByRole('button', { name: 'Start challenge' }).click();
    await expect(page.getByTestId('challenge-quiz')).toBeVisible();
    await page.getByLabel(/Take three breaths/i).check();
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByTestId('quiz-result')).toBeVisible();
    await expect(page.getByTestId('quiz-result')).toContainText(/Score:\s*1\/1/);
    await expect(page.getByText('Completed').first()).toBeVisible();
  });

  test('negative: unauthenticated challenges page prompts sign-in', async ({ page }) => {
    await page.request.post(`${apiBase}/auth/logout`).catch(() => undefined);
    await page.context().clearCookies();
    await page.goto('/en/challenges');
    await expect(page.getByText(/Sign in to try challenges/i)).toBeVisible();
  });
});
