import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const checkParamIdGuard = (paramName: string): CanActivateFn => {
  return (route) => {
    const router = inject(Router);
    const id = route.params[paramName];

    if (!id) {
      return router.navigate(['/select-bar']);
    }
    return true;
  };
};
