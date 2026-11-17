import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { signedIn } from '../services/auth-api';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (signedIn()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
