import { expect, test } from '@playwright/test';

test('restores an active server session in a fresh page', async ({ page, context }) => {
  const api = '**/photo-filter-backend/api';
  let sessionExpired = false;
  await context.route(`${api}/login`, (route) =>
    route.fulfill({
      headers: {
        'Set-Cookie': 'PhotoFilterSession=demo-session; Path=/photo-filter-backend/api; HttpOnly; SameSite=Strict',
      },
      json: { user: { id: 1, username: 'demouser' } },
    }),
  );
  await context.route(`${api}/session`, async (route) => {
    const cookie = await route.request().headerValue('cookie');
    const sessionValid = !sessionExpired && cookie?.includes('PhotoFilterSession=demo-session');
    await route.fulfill({ status: sessionValid ? 204 : 401 });
  });

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
  await expect(newTab.getByRole('button', { name: 'Capture photo' })).toBeVisible();
  await expect(newTab).toHaveURL(/\/home$/);
  await newTab.close();

  sessionExpired = true;
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
});
