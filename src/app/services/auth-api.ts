import { signal } from '@angular/core';

import { apiUrl } from './api-url';

const loginKey = 'photo-filter-signed-in';

interface AuthResponse {
  message?: string;
  user?: { id: number; username: string };
}

export const signedIn = signal(false);

export function markSignedIn(): void {
  sessionStorage.setItem(loginKey, 'true');
  signedIn.set(true);
}

export async function restoreLogin(): Promise<boolean> {
  if (sessionStorage.getItem(loginKey) !== 'true') {
    return false;
  }

  try {
    const response = await fetch(apiUrl('session'), {
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 204) {
      signedIn.set(true);
      return true;
    }

    if (response.status === 401) {
      sessionStorage.removeItem(loginKey);
    }
  } catch {
    return false;
  }

  return false;
}

export async function submitCredentials(
  endpoint: 'login' | 'users',
  username: string,
  password: string,
): Promise<string> {
  const response = await fetch(apiUrl(endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    signal: AbortSignal.timeout(15000),
  });
  const result: AuthResponse = await response.json();

  if (response.ok && result.user) {
    return '';
  }

  return result.message ?? "Couldn't complete the request. Try again.";
}

export async function logout(): Promise<void> {
  const response = await fetch(apiUrl('logout'), {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error('Could not log out.');
  }

  sessionStorage.removeItem(loginKey);
  signedIn.set(false);
}
