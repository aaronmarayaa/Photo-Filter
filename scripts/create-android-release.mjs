import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const { GITHUB_REPOSITORY, GITHUB_RUN_NUMBER, GITHUB_RUN_ATTEMPT, GITHUB_SHA } = process.env;
if (!GITHUB_REPOSITORY || !GITHUB_RUN_NUMBER || !GITHUB_RUN_ATTEMPT || !GITHUB_SHA) {
  throw new Error('Release metadata must be generated inside GitHub Actions.');
}

const server = process.env.GITHUB_SERVER_URL || 'https://github.com';
const tag = `android-${GITHUB_RUN_NUMBER}-${GITHUB_RUN_ATTEMPT}`;
const releaseUrl = `${server}/${GITHUB_REPOSITORY}/releases/tag/${tag}`;
const assetsUrl = `${server}/${GITHUB_REPOSITORY}/releases/download/${tag}`;
const apkUrl = `${assetsUrl}/photo-filter.apk`;
const output = new URL('../dist/android/', import.meta.url);
const sha256 = createHash('sha256')
  .update(readFileSync(new URL('photo-filter.apk', output)))
  .digest('hex');

await QRCode.toFile(fileURLToPath(new URL('install-qr.png', output)), apkUrl, {
  width: 512,
  margin: 4,
  errorCorrectionLevel: 'M',
});
writeFileSync(new URL('SHA256SUMS.txt', output), `${sha256}  photo-filter.apk\n`);
writeFileSync(
  new URL('release-notes.md', output),
  `# Photo Filter for Android

[Download photo-filter.apk](${apkUrl})

Scan this QR code with your Android phone's camera to download the APK:

![Download Photo Filter](${assetsUrl}/install-qr.png)

Open the downloaded APK and allow installation from your browser when Android asks. Allow camera access when opening Photo Filter.

This is a debug-signed test build for Android 7 or newer. The PHP backend must be online. Saving a photo opens Android's file picker. Choose a folder, such as Downloads, and tap Save to keep the PNG on your phone.

Private repository: sign in to a GitHub account with repository access in your phone's browser before scanning.

Source: \`${GITHUB_SHA}\`
Build: ${GITHUB_RUN_NUMBER}, attempt ${GITHUB_RUN_ATTEMPT}
SHA-256: \`${sha256}\`
`,
);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\nrelease_url=${releaseUrl}\n`);
}
