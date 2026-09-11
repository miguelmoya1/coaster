import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '@coaster/common';
import { Auth, CurrentUser } from '@coaster/core';
import { filter, firstValueFrom } from 'rxjs';

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(Auth);
  const currentUser = inject(CurrentUser);
  const router = inject(Router);
  const loaded$ = toObservable(currentUser.current.value).pipe(filter((loaded) => loaded !== undefined));

  await authService.ensureRestored();

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const user = await firstValueFrom(loaded$);

  return user?.role === Role.ADMIN || router.createUrlTree(['/establishments/select']);
};
