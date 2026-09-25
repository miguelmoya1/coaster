import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const noAuthGuard: CanActivateFn = async () => {
  const authService = inject(Auth);
  const router = inject(Router);

  await authService.ensureRestored();

  if (authService.isAuthenticated()) {
    throw new RedirectCommand(router.createUrlTree(['/establishments/select']));
  }

  return true;
};
