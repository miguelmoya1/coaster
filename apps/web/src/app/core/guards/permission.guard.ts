import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { BarPermission } from '@coaster/common';
import { asBarId } from '@coaster/core';
import { combineLatest, filter, map, switchMap, take, timer } from 'rxjs';

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
      return router.createUrlTree(['/app/bars/select']);
    }

    const cleanBarId = asBarId(barId);

    if (barsStore.currentId() !== cleanBarId) {
      barsStore.setBarId(cleanBarId);
    }

    const isLoading$ = toObservable(barsStore.myMember.isLoading);
    const currentId$ = toObservable(barsStore.currentId);

    return timer(0).pipe(
      switchMap(() => combineLatest([isLoading$, currentId$])),
      filter(([isLoading, currentId]) => !isLoading && currentId === cleanBarId),
      take(1),
      map(() => {
        if (barsStore.hasPermission(permission)) {
          return true;
        }
        
        if (permission !== BarPermission.BAR_VIEW_ORDERS && barsStore.hasPermission(BarPermission.BAR_VIEW_ORDERS)) {
          return router.createUrlTree(['/app/bars', cleanBarId, 'orders']);
        }

        return router.createUrlTree(['/app/bars/select']);
      }),
    );
  };
};
