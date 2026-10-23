import { expect, test, type Page } from '@playwright/test';

async function teacherSignIn(page: Page, email: string): Promise<void> {
  await page.goto('/en/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send magic link' }).click();
  await page.locator('a.dev-link').click();
  await expect(page).toHaveURL(/\/en\/?$/);
}

test.describe('E1-S4 claim email', () => {
  test('classroom student links email and keeps same identity via learner login', async ({
    browser,
  }) => {
    const stamp = Date.now();
    const teacherEmail = `e2e-claim-t-${stamp}@example.com`;
    const claimEmail = `e2e-claim-s-${stamp}@example.com`;
    const studentName = `Claim Student ${stamp}`;

    const teacherCtx = await browser.newContext();
    const teacherPage = await teacherCtx.newPage();
    await teacherSignIn(teacherPage, teacherEmail);
    await teacherPage.goto('/en/classroom');
    await teacherPage.getByLabel('Section name').fill(`Claim Sec ${stamp}`);
    await teacherPage.getByRole('button', { name: 'Create section' }).click();
    await expect(teacherPage.getByText('Section code:', { exact: false })).toBeVisible();
    const codeText = await teacherPage.getByText('Section code:', { exact: false }).locator('..').innerText();
    const code = codeText.match(/\b([A-Z2-9]{6})\b/)![1]!;

    await teacherPage.getByLabel('Student display name').fill(studentName);
    await teacherPage.getByRole('button', { name: 'Add student' }).click();
    const secretBlock = await teacherPage
      .getByText('Secret words', { exact: false })
      .first()
      .locator('..')
      .innerText();
    const secretWords = secretBlock.match(/Secret words[^:]*:\s*([A-Za-z]+ [A-Za-z]+)/)![1]!;
    await teacherCtx.close();

    const studentCtx = await browser.newContext();
    const studentPage = await studentCtx.newPage();
    await studentPage.goto('/en/join');
    await studentPage.getByLabel('Section code').fill(code);
    await studentPage.getByRole('button', { name: 'Continue' }).click();
    await studentPage.getByLabel('Pick your name').selectOption(studentName);
    await studentPage.getByLabel('Secret words').fill(secretWords);
    await studentPage.getByRole('button', { name: 'Sign in' }).click();
    await expect(studentPage).toHaveURL(/\/en\/?$/);
    await expect(studentPage.getByText(studentName)).toBeVisible();

    await expect(studentPage.getByRole('heading', { name: 'Link an email to this account' })).toBeVisible();
    await studentPage.getByLabel('Email').fill(claimEmail);
    await studentPage.getByRole('button', { name: 'Send verification link' }).click();
    await studentPage.locator('a.dev-link').click();
    await expect(studentPage).toHaveURL(/\/en\/?$/);
    await expect(studentPage.getByText(claimEmail)).toBeVisible();
    await studentCtx.close();

    const laterCtx = await browser.newContext();
    const laterPage = await laterCtx.newPage();
    await laterPage.goto('/en/sign-up');
    await laterPage.getByLabel('Email').fill(claimEmail);
    await laterPage.getByRole('button', { name: 'Send magic link' }).click();
    await laterPage.locator('a.dev-link').click();
    await expect(laterPage).toHaveURL(/\/en\/?$/);
    await expect(laterPage.getByText(claimEmail)).toBeVisible();
    await laterCtx.close();
  });
});
