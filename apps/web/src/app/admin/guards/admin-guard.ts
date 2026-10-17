import { inject, Injector } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { Auth, CurrentUser, Role, until } from '@coaster/core';

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(Auth);
  const currentUser = inject(CurrentUser);
  const router = inject(Router);
  const injector = inject(Injector);

  await authService.ensureRestored();

  if (!authService.isAuthenticated()) {
    throw new RedirectCommand(router.createUrlTree(['/login']));
  }

  await until(() => !currentUser.current.isLoading() && currentUser.current.status() !== 'idle', injector);

  if (!currentUser.current.hasValue() || currentUser.current.value()?.role !== Role.ADMIN) {
    throw new RedirectCommand(router.createUrlTree(['/establishments/select']));
  }

  return true;
};
