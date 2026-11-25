import { environment } from '../../environments/environment';

export function apiUrl(endpoint: string): string {
  const { apiBaseUrl } = environment;
  if (!apiBaseUrl) {
    throw new Error('Set PHOTO_FILTER_API_URL before building for Android.');
  }
  return `${apiBaseUrl}/${endpoint}`;
}
