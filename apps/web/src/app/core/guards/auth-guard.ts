import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(Auth);
  const router = inject(Router);

  await authService.ensureRestored();

  return authService.isAuthenticated() || router.createUrlTree(['/login']);
};
