import { expect, test } from '@playwright/test';

test('requires a fresh login after reload', async ({ page }) => {
  await page.route('**/photo-filter-backend/api/login', (route) =>
    route.fulfill({ json: { user: { id: 1, username: 'demouser' } } }),
  );

  await page.goto('/photos');

  await expect(page).toHaveURL(/\/login$/);
  await page.locator('ion-input[name="username"] input').fill('demouser');
  await page.locator('ion-input[name="password"] input').fill('demo-password');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
});
