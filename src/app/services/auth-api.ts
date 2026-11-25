import { signal } from '@angular/core';

import { apiUrl } from './api-url';

interface AuthResponse {
  message?: string;
  user?: { id: number; username: string };
}

export const signedIn = signal(false);

export async function restoreLogin(): Promise<boolean> {
  try {
    const response = await fetch(apiUrl('session'), {
      signal: AbortSignal.timeout(10000),
    });

    const restored = response.status === 204;
    signedIn.set(restored);
    return restored;
  } catch {
    return false;
  }
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

  signedIn.set(false);
}
