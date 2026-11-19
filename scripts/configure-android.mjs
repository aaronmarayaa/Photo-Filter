import { writeFileSync } from 'node:fs';

const apiBaseUrl = process.env.PHOTO_FILTER_API_URL?.trim().replace(/\/+$/, '');

if (!apiBaseUrl) {
  throw new Error(
    'Set PHOTO_FILTER_API_URL to your phone-accessible HTTPS backend URL, including /photo-filter-backend/api.',
  );
}

const url = new URL(apiBaseUrl);
if (
  url.protocol !== 'https:' ||
  url.hostname === 'localhost' ||
  url.hostname.endsWith('.localhost') ||
  url.hostname.startsWith('127.') ||
  url.hostname === '[::1]' ||
  url.username ||
  url.password ||
  url.search ||
  url.hash
) {
  throw new Error(
    'PHOTO_FILTER_API_URL must be an HTTPS URL reachable from your phone, without credentials, a query, or a fragment.',
  );
}

writeFileSync(
  new URL('../src/environments/environment.android.ts', import.meta.url),
  `export const environment = ${JSON.stringify({ production: true, apiBaseUrl }, null, 2)};\n`,
);
