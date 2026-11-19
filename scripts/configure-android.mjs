import { writeFileSync } from 'node:fs';
import { normalizeBackendUrl } from '../src/app/services/backend-url.ts';

const suppliedUrl = process.env.PHOTO_FILTER_API_URL?.trim();
let apiBaseUrl = '';
if (suppliedUrl) {
  apiBaseUrl = normalizeBackendUrl(suppliedUrl);
} else {
  console.log('No backend URL supplied. The Android app will ask for it before login.');
}

writeFileSync(
  new URL('../src/environments/environment.android.ts', import.meta.url),
  `export const environment = ${JSON.stringify({ production: true, apiBaseUrl }, null, 2)};\n`,
);
