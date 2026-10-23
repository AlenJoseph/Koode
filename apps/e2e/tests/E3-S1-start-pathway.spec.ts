import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { learnerSignUpUi } from './helpers/auth.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test.describe('E3-S1 start pathway', () => {
  test.beforeAll(() => {
    execFileSync('pnpm', ['db:seed'], { cwd: repoRoot, stdio: 'pipe', env: process.env });
  });

  test('happy: learner browses published pathway and starts enrollment', async ({ page }) => {
    const learnerEmail = `e2e-e3s1-learner-${Date.now()}@example.com`;
    await learnerSignUpUi(page, learnerEmail);

    await page.goto('/en/pathways');
    await expect(page.getByRole('heading', { name: /pathways/i })).toBeVisible();
    const card = page.locator('[data-pathway-slug="know-yourself"]');
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click();

    await page.getByRole('button', { name: 'Start pathway' }).click();
    await expect(page.getByText('Started')).toBeVisible();
  });

  test('negative: signed-out visitor is prompted to sign in', async ({ page }) => {
    await page.goto('/en/pathways');
    await expect(page.getByText(/Sign in to browse/i)).toBeVisible();
  });
});
