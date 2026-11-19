import { environment } from '../../environments/environment';

export const chooseServerOnPhone = !environment.apiBaseUrl;
export const serverStorageKey = 'photo-filter-backend-url';

export function getBackendUrl(): string {
  return environment.apiBaseUrl || localStorage.getItem(serverStorageKey) || '';
}

export function apiUrl(endpoint: string): string {
  const base = getBackendUrl();
  if (!base) {
    throw new Error('Set the backend address before using the app.');
  }
  return `${base}/${endpoint}`;
}
