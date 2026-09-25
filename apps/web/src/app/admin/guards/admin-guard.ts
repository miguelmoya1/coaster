import { inject, Injector } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { Role } from '@coaster/common';
import { Auth, CurrentUser, until } from '@coaster/core';

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(Auth);
  const currentUser = inject(CurrentUser);
  const router = inject(Router);
  const injector = inject(Injector);

  await authService.ensureRestored();

  if (!authService.isAuthenticated()) {
    throw new RedirectCommand(router.createUrlTree(['/login']));
  }

  await until(() => currentUser.current.value() !== undefined, injector);

  if (currentUser.current.value()?.role !== Role.ADMIN) {
    throw new RedirectCommand(router.createUrlTree(['/establishments/select']));
  }

  return true;
};
