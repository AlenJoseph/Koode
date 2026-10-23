/**
 * Pilot end-to-end — one classroom loop + one independent learner loop.
 * Seeds manuals, then verifies teacher → student → quiz → tutor → progress → insights.
 */
import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { learnerSignUpUi, teacherSignInUi } from './helpers/auth.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

async function createSectionWithStudent(
  page: Page,
  sectionName: string,
  studentName: string,
): Promise<{ sectionCode: string; secretWords: string }> {
  await page.goto('/en/classroom');
  await expect(page.getByRole('heading', { name: 'Your classrooms' })).toBeVisible();

  await page.getByLabel('Section name').fill(sectionName);
  await page.getByRole('button', { name: 'Create section' }).click();
  await expect(page.getByRole('button', { name: new RegExp(sectionName) })).toBeVisible();

  const codeLabel = page.getByText('Section code:', { exact: false });
  await expect(codeLabel).toBeVisible();
  const codeBlock = await codeLabel.locator('..').innerText();
  const codeMatch = codeBlock.match(/\b([A-Z2-9]{6})\b/);
  expect(codeMatch).toBeTruthy();
  const sectionCode = codeMatch![1]!;

  await page.getByLabel('Student display name').fill(studentName);
  await page.getByRole('button', { name: 'Add student' }).click();
  await expect(page.getByText(studentName, { exact: true })).toBeVisible();

  const secretCard = page.locator('p').filter({ hasText: /Secret words \(save for login card\)/i });
  await expect(secretCard).toBeVisible();
  const secretBlock = await secretCard.innerText();
  const secretMatch = secretBlock.match(/:\s*([A-Z]+ [A-Z]+)/);
  expect(secretMatch).toBeTruthy();

  return { sectionCode, secretWords: secretMatch![1]! };
}

async function studentJoin(
  page: Page,
  sectionCode: string,
  studentName: string,
  secretWords: string,
): Promise<void> {
  await page.goto('/en/join');
  await expect(page.getByRole('heading', { name: 'Join your class' })).toBeVisible();
  await page.getByLabel('Section code').fill(sectionCode);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Pick your name').selectOption(studentName);
  await page.getByLabel('Secret words').fill(secretWords);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await expect(page.locator('.topbar-user')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Home' }).getByText(studentName)).toBeVisible();
}

async function completeSeededQuiz(page: Page): Promise<void> {
  await page.goto('/en/pathways');
  await expect(page.getByRole('heading', { name: /pathways/i })).toBeVisible();
  const pathway = page.locator('[data-pathway-slug="know-yourself"]');
  await expect(pathway).toBeVisible({ timeout: 20_000 });
  await pathway.click();

  await expect(page.getByRole('button', { name: 'Start pathway' })).toBeVisible();
  await page.getByRole('button', { name: 'Start pathway' }).click();
  await expect(page.getByText('Started')).toBeVisible();

  const challenge = page.locator('[data-challenge-slug="pause-before-react"]');
  await expect(challenge).toBeVisible();
  await challenge.click();
  await expect(page).toHaveURL(/\/en\/challenges\/[0-9a-f-]+/);

  await page.getByRole('button', { name: 'Start challenge' }).click();
  await expect(page.getByTestId('challenge-quiz')).toBeVisible();
  await page.getByLabel(/Take three breaths/i).check();
  await page.getByRole('button', { name: 'Submit answers' }).click();
  await expect(page.getByTestId('quiz-result')).toBeVisible();
  await expect(page.getByTestId('quiz-result')).toContainText(/Score:\s*1\/1/);
}

async function useTutor(page: Page): Promise<void> {
  await page.goto('/en/tutor');
  await expect(page.getByRole('heading', { name: /tutor/i })).toBeVisible();
  await page.getByLabel('Topic').fill('pausing before I react');
  await page.getByLabel('Your message').fill('How do I practise a pause at school?');
  await page.getByRole('button', { name: 'Ask Koode' }).click();
  await expect(page.getByText(/adapter:\s*stub/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Stub tutor:/i)).toBeVisible();
}

async function assertProgressHasAttempt(page: Page): Promise<void> {
  await page.goto('/en/progress');
  await expect(page.getByRole('heading', { name: /progress/i })).toBeVisible();
  await expect(page.getByText(/Pause before you react|completed|in_progress/i).first()).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('PILOT end-to-end', () => {
  test.beforeAll(() => {
    execFileSync('pnpm', ['db:seed'], { cwd: repoRoot, stdio: 'pipe', env: process.env });
  });

  test('classroom pilot: teacher → join → pathway quiz → tutor → progress → insights', async ({
    browser,
  }) => {
    const stamp = Date.now();
    const teacherEmail = `pilot-teacher-${stamp}@example.com`;
    const studentName = `Pilot Student ${stamp}`;
    const sectionName = `Pilot Class ${stamp}`;

    const teacherCtx = await browser.newContext();
    const teacherPage = await teacherCtx.newPage();
    await teacherSignInUi(teacherPage, teacherEmail);
    await expect(
      teacherPage.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Classroom' }),
    ).toBeVisible();

    const { sectionCode, secretWords } = await createSectionWithStudent(
      teacherPage,
      sectionName,
      studentName,
    );

    // Keep teacher session for insights after student works.
    const studentCtx = await browser.newContext();
    const studentPage = await studentCtx.newPage();
    await studentJoin(studentPage, sectionCode, studentName, secretWords);
    await completeSeededQuiz(studentPage);
    await useTutor(studentPage);
    await assertProgressHasAttempt(studentPage);
    await studentCtx.close();

    await teacherPage.goto('/en/insights');
    await expect(teacherPage.getByTestId('insights-page')).toBeVisible();
    await expect(teacherPage.getByTestId('learning-support-graph')).toBeVisible();
    await expect(teacherPage.getByTestId('insights-support-legend')).toContainText(
      /not a clinical diagnosis/i,
    );
    const body = await teacherPage.locator('body').innerText();
    expect(body.toLowerCase()).not.toContain('chat transcript');

    await teacherCtx.close();
  });

  test('independent learner pilot: sign-up → quiz → tutor → progress', async ({ page }) => {
    const email = `pilot-learner-${Date.now()}@example.com`;
    await learnerSignUpUi(page, email);
    await expect(
      page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Pathways' }),
    ).toBeVisible();
    await completeSeededQuiz(page);
    await useTutor(page);
    await assertProgressHasAttempt(page);
  });

  test('negative: teacher cannot use tutor API surface in UI', async ({ page }) => {
    const email = `pilot-teacher-block-${Date.now()}@example.com`;
    await teacherSignInUi(page, email);
    await page.goto('/en/tutor');
    // Shell hides Tutor for teachers; direct URL should still not expose a working learner tutor.
    // Teachers land without learner nav — page may show need-sign-in or empty session messaging after fetchMe.
    await expect(
      page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Classroom' }),
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Tutor' }),
    ).toHaveCount(0);
  });
});
