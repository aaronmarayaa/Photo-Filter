import { writeFileSync } from 'node:fs';
import { normalizeBackendUrl } from '../src/app/services/backend-url.ts';

const suppliedUrl = process.env.PHOTO_FILTER_API_URL?.trim();
if (!suppliedUrl) {
  throw new Error('Set PHOTO_FILTER_API_URL to the full HTTPS backend API URL before building for Android.');
}

const apiBaseUrl = normalizeBackendUrl(suppliedUrl);
writeFileSync(
  new URL('../src/environments/environment.android.ts', import.meta.url),
  `export const environment = ${JSON.stringify({ production: true, apiBaseUrl }, null, 2)};\n`,
);
