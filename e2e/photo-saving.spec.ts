import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const api = '**/photo-filter-backend/api';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGGkAAAAASUVORK5CYII=',
  'base64',
);

test.beforeEach(async ({ page, context }) => {
  await context.route(`${api}/session`, (route) => route.fulfill({ status: 204 }));
  await context.route(`${api}/photos`, (route) =>
    route.fulfill({ json: { photos: [{ id: 1, createdAt: '2026-11-19T00:00:00Z' }] } }),
  );
  await context.route(`${api}/photos/1/image`, (route) => route.fulfill({ contentType: 'image/png', body: png }));
  await page.goto('/photos');
  await page.getByRole('button', { name: 'Open photo-1.png' }).click();
  await expect(page.getByRole('button', { name: 'Save photo' })).toBeVisible();
});

test('saves the original PNG through the browser download fallback', async ({ page }) => {
  const downloadStarted = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save photo' }).click();
  const download = await downloadStarted;
  expect(download.suggestedFilename()).toBe('photo-1.png');
  const downloadPath = await download.path();
  if (!downloadPath) {
    throw new Error('The photo download did not create a file.');
  }
  expect(await readFile(downloadPath)).toEqual(png);
});

test('explains a failed save and allows another attempt', async ({ page }) => {
  await page.route(`${api}/photos/1/image`, (route) =>
    route.fulfill({ status: 401, json: { message: 'Log in first.' } }),
  );
  await page.getByRole('button', { name: 'Save photo' }).click();
  await expect(page.getByRole('alert')).toHaveText('Log in first.');
  await expect(page.getByRole('button', { name: 'Save photo' })).toBeEnabled();
});
