import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { asBarId, BarPermission } from '@coaster/common';
import { combineLatest, filter, map, take } from 'rxjs';

export const permissionGuard = (permission: BarPermission): CanActivateFn => {
  return (route) => {
    const barsStore = inject(BarsStore);
    const router = inject(Router);

    let barId = route.paramMap.get('barId');
    let parent = route.parent;
    while (!barId && parent) {
      barId = parent.paramMap.get('barId');
      parent = parent.parent;
    }

    if (!barId) {
      return router.createUrlTree(['/']);
    }

    const cleanBarId = asBarId(barId);

    if (barsStore.currentId() !== cleanBarId) {
      barsStore.setBarId(cleanBarId);
    }

    const isLoading$ = toObservable(barsStore.myMember.isLoading);
    const currentId$ = toObservable(barsStore.currentId);

    return combineLatest([isLoading$, currentId$]).pipe(
      filter(([isLoading, currentId]) => !isLoading && currentId === cleanBarId),
      take(1),
      map(() => {
        if (barsStore.hasPermission(permission)) {
          return true;
        }
        return router.createUrlTree(['/bars', cleanBarId, 'dashboard']);
      })
    );
  };
};
