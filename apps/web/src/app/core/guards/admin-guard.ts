import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '@coaster/common';
import { filter, map, switchMap, take } from 'rxjs';
import { Auth } from '../services/auth';
import { CurrentUser } from '../services/current-user';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const currentUser = inject(CurrentUser);
  const router = inject(Router);

  const isAuthLoaded$ = toObservable(authService.isAuthLoaded);
  const currentUser$ = toObservable(currentUser.current.value);

  return isAuthLoaded$.pipe(
    filter((isLoaded) => isLoaded),
    take(1),
    switchMap(() => {
      if (!authService.isAuthenticated()) {
        return [router.createUrlTree(['/app/login'])];
      }

      return currentUser$.pipe(
        filter((user) => user !== undefined),
        take(1),
        map((user) => {
          if (user && user.role === Role.ADMIN) {
            return true;
          }
          return router.createUrlTree(['/app/bars/select']);
        }),
      );
    }),
  );
};
