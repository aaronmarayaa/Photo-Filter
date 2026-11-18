import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { restoreLogin, signedIn } from '../services/auth-api';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);

  if (signedIn() || (await restoreLogin())) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
