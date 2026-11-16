import { test, expect } from '@playwright/test';
async function login(page, email = 'student@pathpilot.local') {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('PilotLab2026!');
  await page.getByRole('button', { name: 'Sign in', exact: false }).click();
  await expect(page).toHaveURL(email.startsWith('admin') ? '/admin' : '/dashboard');
}
test('Student can update profile, learning and goals; data survives refresh', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'A little progress, every day.' })).toBeVisible();
  await expect(page.locator('.hero')).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCSS('position', 'fixed');
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'My profile' }).click();
  await page.getByLabel('College / institution').fill('IEM Lab Verification');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status')).toContainText('Profile saved');
  await page.reload();
  await expect(page.getByLabel('College / institution')).toHaveValue('IEM Lab Verification');
  await page.getByRole('link', { name: 'Learning tracker' }).click();
  await page.getByRole('button', { name: 'Add topic' }).click();
  await page.getByLabel('Topic title').last().fill('Browser-tested learning topic');
  await page.getByLabel('Progress (%)').last().fill('80');
  await page.getByLabel('Hours spent').last().fill('3');
  await page.getByRole('button', { name: 'Save learning progress' }).click();
  await expect(page.getByRole('status')).toContainText('Learning progress saved');
  await page.reload();
  await expect(page.getByLabel('Topic title').last()).toHaveValue('Browser-tested learning topic');
  await page.getByRole('link', { name: 'Career goals' }).click();
  await page.getByRole('button', { name: 'Add a goal' }).click();
  await page.getByLabel('Career path').last().selectOption('data-analyst');
  await page.getByLabel('What does success look like?').last().fill('Build an analytics portfolio');
  await page.getByRole('button', { name: 'Save goals' }).click();
  await expect(page.getByRole('status')).toContainText('Goals saved');
});
test('Mock test completion, saved feedback, analytics and guidance', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  await page.getByRole('link', { name: 'Mock tests' }).click();
  await page.getByLabel('Choose a skill').selectOption('JavaScript');
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByRole('heading', { name: 'JavaScript practice' })).toBeVisible();
  const questions = page.locator('fieldset.question');
  const count = await questions.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) await questions.nth(i).getByRole('radio').first().check();
  await page.reload();
  await expect(questions.first().getByRole('radio').first()).toBeChecked();
  await page.getByRole('button', { name: 'Submit test' }).click();
  await expect(page.getByText('PRACTICE COMPLETE', { exact: true })).toBeVisible();
  await expect(page.locator('.explanation')).toHaveCount(count);
  await page.getByRole('link', { name: 'See performance' }).click();
  await expect(page.getByRole('heading', { name: 'Your effort, made visible.' })).toBeVisible();
  await expect(page.locator('.chart-column')).not.toHaveCount(0);
  await page.getByRole('link', { name: 'Career guidance' }).click();
  await expect(page.getByRole('heading', { name: 'A roadmap that grows with you.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'MDN' }).first()).toHaveAttribute(
    'href',
    /developer.mozilla.org/,
  );
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/guidance-desktop.png', fullPage: true });
});
test('Unavailable external quiz gives usable local fallback', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Mock tests' }).click();
  await page.getByRole('button', { name: 'Try external practice' }).click();
  await expect(
    page.getByText('The external quiz service is unavailable.', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('fieldset.question')).toHaveCount(5);
});
test('Admin creates and deactivates a question', async ({ page }) => {
  await login(page, 'admin@pathpilot.local');
  await expect(page.getByRole('heading', { name: 'Help students move forward.' })).toBeVisible();
  await page
    .getByLabel('Question', { exact: true })
    .fill('Which option is the browser test answer?');
  for (let i = 1; i <= 4; i++)
    await page.getByLabel(`Option ${i}`, { exact: true }).fill(`Answer ${i}`);
  await page.getByLabel('Explanation').fill('Answer 1 is the correct example.');
  await page.getByRole('button', { name: 'Add question', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Question saved');
  const row = page.getByRole('row').filter({ hasText: 'Which option is the browser test answer?' });
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Availability').selectOption({ label: 'Inactive' });
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(row).toContainText('Inactive');
  await page.screenshot({ path: 'test-results/admin-desktop.png', fullPage: true });
});
test('Mobile navigation and registration work without horizontal page overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
  await page.screenshot({ path: 'test-results/login-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Your name').fill('Mobile Student');
  await page.getByLabel('Email address').fill(`mobile-${Date.now()}@test.local`);
  await page.getByLabel('Password', { exact: true }).fill('MobilePilot2026!');
  await page.getByRole('button', { name: 'Create account', exact: false }).click();
  await expect(page).toHaveURL(/\/explore/);
  await expect(page.getByRole('heading', { name: 'One subscription. Every feature.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Career guidance' }).click();
  await expect(page).toHaveURL(/\/explore/);
  await expect(page.getByRole('heading', { name: 'One subscription. Every feature.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/explore/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/login');
  await page.goto('/profile');
  await expect(page).toHaveURL('/login');
});
