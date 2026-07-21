import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { CurrentBarStore, MyMemberStore } from '@coaster/bars';
import { BarPermission } from '@coaster/common';
import { asBarId } from '@coaster/core';
import { combineLatest, filter, map, switchMap, take, timer } from 'rxjs';

export const permissionGuard = (permission: BarPermission): CanActivateFn => {
  return (route) => {
    const currentBarStore = inject(CurrentBarStore);
    const myMemberStore = inject(MyMemberStore);
    const router = inject(Router);

    let barId = route.paramMap.get('barId');
    let parent = route.parent;
    while (!barId && parent) {
      barId = parent.paramMap.get('barId');
      parent = parent.parent;
    }

    if (!barId) {
      return router.createUrlTree(['/bars/select']);
    }

    const cleanBarId = asBarId(barId);

    if (currentBarStore.currentId() !== cleanBarId) {
      currentBarStore.setBarId(cleanBarId);
    }

    const isLoading$ = toObservable(myMemberStore.myMember.isLoading);
    const currentId$ = toObservable(currentBarStore.currentId);

    return timer(0).pipe(
      switchMap(() => combineLatest([isLoading$, currentId$])),
      filter(([isLoading, currentId]) => !isLoading && currentId === cleanBarId),
      take(1),
      map(() => {
        if (myMemberStore.hasPermission(permission)) {
          return true;
        }
        
        if (permission !== BarPermission.BAR_VIEW_ORDERS && myMemberStore.hasPermission(BarPermission.BAR_VIEW_ORDERS)) {
          return router.createUrlTree(['/bars', cleanBarId, 'orders']);
        }

        return router.createUrlTree(['/bars/select']);
      }),
    );
  };
};
