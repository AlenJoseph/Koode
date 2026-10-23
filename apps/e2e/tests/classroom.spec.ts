import { expect, test, type Page } from '@playwright/test';

async function teacherSignIn(page: Page, email: string): Promise<void> {
  await page.goto('/en/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send magic link' }).click();
  const verifyLink = page.locator('a.dev-link');
  await expect(verifyLink).toBeVisible();
  await verifyLink.click();
  await expect(page).toHaveURL(/\/en\/?$/);
}

test.describe('classroom critical path', () => {
  test('teacher creates section; student joins with secret words', async ({ browser }) => {
    const stamp = Date.now();
    const teacherEmail = `e2e-teacher-${stamp}@example.com`;
    const studentName = `Student ${stamp}`;
    const sectionName = `E2E Class ${stamp}`;

    const teacher = await browser.newContext();
    const teacherPage = await teacher.newPage();

    await teacherSignIn(teacherPage, teacherEmail);

    await teacherPage.goto('/en/classroom');
    await expect(teacherPage.getByRole('heading', { name: 'Your classrooms' })).toBeVisible();

    await teacherPage.getByLabel('Section name').fill(sectionName);
    await teacherPage.getByRole('button', { name: 'Create section' }).click();
    await expect(teacherPage.getByRole('button', { name: new RegExp(sectionName) })).toBeVisible();

    const codeLabel = teacherPage.getByText('Section code:', { exact: false });
    await expect(codeLabel).toBeVisible();
    const codeBlock = await codeLabel.locator('..').innerText();
    const codeMatch = codeBlock.match(/\b([A-Z2-9]{6})\b/);
    expect(codeMatch).toBeTruthy();
    const sectionCode = codeMatch![1]!;

    await teacherPage.getByLabel('Student display name').fill(studentName);
    await teacherPage.getByRole('button', { name: 'Add student' }).click();
    await expect(teacherPage.getByText(studentName, { exact: true })).toBeVisible();

    const secretCard = teacherPage
      .locator('p')
      .filter({ hasText: /Secret words \(save for login card\)/i });
    await expect(secretCard).toBeVisible();
    const secretBlock = await secretCard.innerText();
    const secretMatch = secretBlock.match(/:\s*([A-Z]+ [A-Z]+)/);
    expect(secretMatch).toBeTruthy();
    const secretWords = secretMatch![1]!;

    await teacher.close();

    const student = await browser.newContext();
    const studentPage = await student.newPage();

    await studentPage.goto('/en/join');
    await expect(studentPage.getByRole('heading', { name: 'Join your class' })).toBeVisible();
    await studentPage.getByLabel('Section code').fill(sectionCode);
    await studentPage.getByRole('button', { name: 'Continue' }).click();

    await studentPage.getByLabel('Pick your name').selectOption(studentName);
    await studentPage.getByLabel('Secret words').fill(secretWords);
    await studentPage.getByRole('button', { name: 'Sign in' }).click();

    await expect(studentPage).toHaveURL(/\/en\/?$/);
    await expect(studentPage.locator('.topbar-user')).toBeVisible();
    await expect(studentPage.getByRole('region', { name: 'Home' }).getByText(studentName)).toBeVisible();

    await student.close();
  });
});
