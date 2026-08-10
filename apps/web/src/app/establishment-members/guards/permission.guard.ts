import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { EstablishmentPermission, asEstablishmentId } from '@coaster/common';
import { combineLatest, filter, map, switchMap, take, timer } from 'rxjs';
import { MyMemberStore } from '../store/my-member.store';

export const permissionGuard = (permission: EstablishmentPermission): CanActivateFn => {
  return (route) => {
    const myMemberStore = inject(MyMemberStore);
    const router = inject(Router);

    let establishmentId = route.paramMap.get('establishmentId');
    let parent = route.parent;
    while (!establishmentId && parent) {
      establishmentId = parent.paramMap.get('establishmentId');
      parent = parent.parent;
    }

    if (!establishmentId) {
      return router.createUrlTree(['/establishments/select']);
    }

    const cleanEstablishmentId = asEstablishmentId(establishmentId);

    if (myMemberStore.currentEstablishmentId() !== cleanEstablishmentId) {
      myMemberStore.setEstablishmentId(cleanEstablishmentId);
    }

    const isLoading$ = toObservable(myMemberStore.myMember.isLoading);
    const currentEstablishmentId$ = toObservable(myMemberStore.currentEstablishmentId);

    return timer(0).pipe(
      switchMap(() => combineLatest([isLoading$, currentEstablishmentId$])),
      filter(([isLoading, currentEstablishmentId]) => !isLoading && currentEstablishmentId === cleanEstablishmentId),
      take(1),
      map(() => {
        if (myMemberStore.hasPermission(permission)) {
          return true;
        }

        if (
          permission !== EstablishmentPermission.ESTABLISHMENT_VIEW_ORDERS &&
          myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_VIEW_ORDERS)
        ) {
          return router.createUrlTree(['/establishments', cleanEstablishmentId, 'orders']);
        }

        return router.createUrlTree(['/establishments/select']);
      }),
    );
  };
};
