import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { BarPermission, asBarId } from '@coaster/common';
import { combineLatest, filter, map, switchMap, take, timer } from 'rxjs';
import { MyMemberStore } from '../store/my-member.store';

export const permissionGuard = (permission: BarPermission): CanActivateFn => {
  return (route) => {
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

    if (myMemberStore.currentBarId() !== cleanBarId) {
      myMemberStore.setBarId(cleanBarId);
    }

    const isLoading$ = toObservable(myMemberStore.myMember.isLoading);
    const currentBarId$ = toObservable(myMemberStore.currentBarId);

    return timer(0).pipe(
      switchMap(() => combineLatest([isLoading$, currentBarId$])),
      filter(([isLoading, currentBarId]) => !isLoading && currentBarId === cleanBarId),
      take(1),
      map(() => {
        if (myMemberStore.hasPermission(permission)) {
          return true;
        }

        if (
          permission !== BarPermission.BAR_VIEW_ORDERS &&
          myMemberStore.hasPermission(BarPermission.BAR_VIEW_ORDERS)
        ) {
          return router.createUrlTree(['/bars', cleanBarId, 'orders']);
        }

        return router.createUrlTree(['/bars/select']);
      }),
    );
  };
};
