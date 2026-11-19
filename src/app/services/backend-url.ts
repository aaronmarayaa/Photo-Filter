export function normalizeBackendUrl(value: string): string {
  const url = new URL(value.trim());
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
    throw new Error('Use a phone-accessible HTTPS backend URL without credentials, a query, or a fragment.');
  }
  return url.href.replace(/\/+$/, '');
}
