import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { Auth } from '../services/auth';

export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);

  return toObservable(authService.isAuthLoaded).pipe(
    filter((isLoaded) => isLoaded),
    map(() => {
      if (!authService.isAuthenticated()) {
        return true;
      }

      return router.createUrlTree(['/']);
    }),
  );
};
