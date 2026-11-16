import { test, expect } from '@playwright/test';
test('Student requests a skill, admin approves and publishes questions, student practises', async ({ page, browser }) => {
  async function login(p, email) {
    await p.goto('/login'); await p.getByLabel('Email address').fill(email);
    await p.getByLabel('Password', { exact: true }).fill('PilotLab2026!');
    await p.getByRole('button', { name: 'Sign in', exact: false }).click();
    await expect(p).toHaveURL(email.startsWith('admin') ? '/admin' : '/dashboard');
  }
  await login(page, 'student@pathpilot.local');
  await page.goto('/learning');
  await page.getByRole('button', { name: 'Request another skill' }).click();
  await page.getByLabel('Requested skill', { exact: true }).fill('React');
  await page.getByLabel('Skill domain').selectOption('Software engineering');
  await page.getByLabel('What would you like to learn?').fill('I want to practise components and React hooks.');
  await page.getByRole('button', { name: 'Send skill request' }).click();
  await expect(page.getByText('Waiting for admin review.', { exact: true })).toBeVisible();
  const adminContext = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' });
  try {
    const admin = await adminContext.newPage(); await login(admin, 'admin@pathpilot.local');
    await admin.getByRole('link', { name: 'Skill requests', exact: true }).click();
    await admin.getByLabel('Review note for React').fill('Approved. Component state questions will be provided.');
    await admin.getByRole('button', { name: 'Approve React', exact: true }).click();
    await expect(admin.getByRole('status')).toContainText('Skill approved');
    await page.getByRole('button', { name: 'Refresh requests' }).click();
    await expect(page.getByText('Tests are being prepared by the admin.', { exact: true })).toBeVisible();
    await page.getByLabel('Skill to add', { exact: true }).selectOption('React');
    await page.getByRole('button', { name: '+ Add skill', exact: true }).click();
    await page.getByRole('button', { name: 'Save learning progress' }).click();
    await expect(page.getByRole('status')).toContainText('Learning progress saved');
    await admin.getByRole('link', { name: 'Add test questions for React' }).click();
    await expect(admin.getByRole('combobox', { name: 'Skill', exact: true })).toHaveValue('React');
    await admin.getByLabel('Question', { exact: true }).fill('Which React hook manages component state?');
    for (const [i, answer] of ['useState', 'margin', 'padding', 'background'].entries()) await admin.getByLabel('Option ' + (i + 1), { exact: true }).fill(answer);
    await admin.getByLabel('Explanation').fill('useState manages local state in function components.');
    await admin.getByRole('button', { name: 'Add question', exact: true }).click();
    await expect(admin.getByRole('status')).toContainText('Question saved');
    await page.getByRole('button', { name: 'Refresh requests' }).click();
    await page.getByRole('link', { name: 'Practise React' }).click();
    await expect(page.getByLabel('Choose a skill')).toHaveValue('React');
    await page.getByRole('button', { name: 'Start practice' }).click();
    await expect(page.getByRole('heading', { name: 'React practice' })).toBeVisible();
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'Submit test' }).click();
    await expect(page.getByText('PRACTICE COMPLETE', { exact: true })).toBeVisible();
    await page.goto('/learning'); await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: 'React', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/skill-requests-mobile.png', fullPage: true });
  } finally { await adminContext.close(); }
});
