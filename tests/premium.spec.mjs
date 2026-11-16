import { test, expect } from '@playwright/test';
async function login(page, email = 'student@pathpilot.local') {
  await page.goto('/login'); await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('PilotLab2026!');
  await page.getByRole('button', { name: 'Sign in', exact: false }).click();
  await expect(page).toHaveURL(email.startsWith('admin') ? '/admin' : '/dashboard');
}
test('Student upgrades through checkout callback, keeps access after reload and downloads a report', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('https://checkout.razorpay.com/v1/checkout.js', route => route.fulfill({ contentType: 'application/javascript', body: `
    window.Razorpay = class { constructor(options) { this.options = options; } on() {} async open() {
      const result = await fetch('/__test_payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: this.options.order_id }) });
      this.options.handler(await result.json());
    } };` }));
  await page.goto('/login'); await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Your name').fill('Subscription Student');
  await page.getByLabel('Email address').fill('subscription@test.local');
  await page.getByLabel('Password', { exact: true }).fill('PilotLab2026!');
  await page.getByRole('button', { name: 'Create account', exact: false }).click();
  await expect(page).toHaveURL(/\/explore/);
  await expect(page.getByRole('heading', { name: 'One subscription. Every feature.' })).toBeVisible();
  for (const route of ['/profile', '/learning', '/goals', '/tests', '/analytics', '/guidance', '/dashboard', '/tests/000000000000000000000001']) {
    await page.goto(route); await expect(page).toHaveURL(/\/explore/);
  }
  await page.getByRole('link', { name: 'Subscription & payments' }).click();
  await expect(page.getByRole('heading', { name: 'Preview only' })).toBeVisible();
  await page.screenshot({ path: 'test-results/premium-basic-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Subscribe with test payment' }).click();
  await expect(page.getByRole('heading', { name: 'Subscription active' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Choose your career direction' })).toBeVisible();
  await page.getByRole('link', { name: 'Choose my career direction' }).click();
  await page.getByLabel('Career for my roadmap').selectOption('data-analyst');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status')).toContainText('Profile saved');
  await page.goto('/premium');
  await expect(page.getByRole('heading', { name: /Four weeks toward/ })).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', { name: 'Subscription active' })).toBeVisible();
  await page.goto('/tests');
  await expect(page.getByRole('button', { name: 'Start practice' })).toBeVisible();
  await page.goto('/premium');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download progress report' }).click();
  expect((await download).suggestedFilename()).toBe('Path_Pilot_Progress_Report.csv');
  await page.screenshot({ path: 'test-results/premium-active-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('Admin searches enrollment records and reviews the verified payment register', async ({ page }) => {
  await login(page, 'admin@pathpilot.local');
  await page.getByRole('link', { name: 'Enrolled students', exact: true }).click();
  await page.getByLabel('Search by name or email').fill('subscription@test.local');
  await page.getByRole('combobox', { name: 'Plan', exact: true }).selectOption('premium');
  await page.getByRole('button', { name: 'Search students' }).click();
  const row = page.getByRole('row').filter({ hasText: 'subscription@test.local' });
  await expect(row).toContainText('Subscribed'); await expect(row).toContainText('PP-');
  await page.screenshot({ path: 'test-results/enrollments-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Payments', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'subscription@test.local' })).toContainText('Paid');
  await page.screenshot({ path: 'test-results/payments-desktop.png', fullPage: true });
});
test('Premium page is usable on mobile and checkout cancellation grants no access', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://checkout.razorpay.com/v1/checkout.js', route => route.fulfill({ contentType: 'application/javascript', body:
    `window.Razorpay = class { constructor(options) { this.options = options; } on() {} open() { this.options.modal.ondismiss(); } };` }));
  await page.goto('/login'); await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Your name').fill('Premium Mobile Student');
  await page.getByLabel('Email address').fill(`premium-mobile-${Date.now()}@test.local`);
  await page.getByLabel('Password', { exact: true }).fill('MobilePilot2026!');
  await page.getByRole('button', { name: 'Create account', exact: false }).click(); await expect(page).toHaveURL(/\/explore/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Subscription & payments' }).click();
  await page.getByRole('button', { name: 'Subscribe with test payment' }).click();
  await expect(page.getByText('Checkout closed.', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Preview only' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download progress report' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/premium-mobile.png', fullPage: true });
});
