import { expect, test } from '@playwright/test';

test('restores an active login after refresh in the same tab', async ({ page, context }) => {
  const api = '**/photo-filter-backend/api';
  let sessionStatus = 204;
  await context.route(`${api}/login`, (route) => route.fulfill({ json: { user: { id: 1, username: 'demouser' } } }));
  await context.route(`${api}/session`, (route) => route.fulfill({ status: sessionStatus }));

  await page.goto('/home');
  await expect(page).toHaveURL(/\/login$/);
  await page.locator('ion-input[name="username"] input').fill('demouser');
  await page.locator('ion-input[name="password"] input').fill('demo-password');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.reload();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('button', { name: 'Capture photo' })).toBeVisible();

  const newTab = await context.newPage();
  await newTab.goto('/home');
  await expect(newTab).toHaveURL(/\/login$/);
  await newTab.close();

  sessionStatus = 401;
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
});
