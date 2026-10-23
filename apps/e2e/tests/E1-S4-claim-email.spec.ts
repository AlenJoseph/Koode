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
    const secretCard = teacherPage
      .locator('p')
      .filter({ hasText: /Secret words \(save for login card\)/i });
    await expect(secretCard).toBeVisible();
    const secretWords = (await secretCard.innerText()).match(/:\s*([A-Z]+ [A-Z]+)/)![1]!;
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
    // Display name stays on roster; claim form disappears once email is linked.
    await expect(studentPage.getByRole('region', { name: 'Home' }).getByText(studentName)).toBeVisible();
    await expect(studentPage.getByRole('heading', { name: 'Link an email to this account' })).toHaveCount(
      0,
    );
    await expect(studentPage.locator('.topbar-user')).toHaveAttribute('title', claimEmail);
    await studentCtx.close();

    const laterCtx = await browser.newContext();
    const laterPage = await laterCtx.newPage();
    await laterPage.goto('/en/sign-up');
    await laterPage.getByLabel('Email').fill(claimEmail);
    await laterPage.getByLabel(/I confirm I am 13 or older/i).check();
    await laterPage.getByRole('button', { name: 'Send magic link' }).click();
    await laterPage.locator('a.dev-link').click();
    await expect(laterPage).toHaveURL(/\/en\/?$/);
    // Same user: roster display name + claimed email on session.
    await expect(laterPage.getByRole('region', { name: 'Home' }).getByText(studentName)).toBeVisible();
    await expect(laterPage.locator('.topbar-user')).toHaveAttribute('title', claimEmail);
    await laterCtx.close();
  });
});
