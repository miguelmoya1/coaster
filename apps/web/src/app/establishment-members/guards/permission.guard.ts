import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { EstablishmentModule, EstablishmentPermission, asEstablishmentId } from '@coaster/common';
import { ModulesStore } from '@coaster/establishments';
import { combineLatest, filter, map, switchMap, take, timer } from 'rxjs';
import { MyMemberStore } from '../store/my-member.store';

/** In the order someone should be sent to them: the least surprising landing first. */
const FALLBACKS: { permission: EstablishmentPermission; module?: EstablishmentModule; path: string }[] = [
  { permission: EstablishmentPermission.ESTABLISHMENT_VIEW_DASHBOARD, path: 'dashboard' },
  { permission: EstablishmentPermission.ESTABLISHMENT_VIEW_SHIFTS, path: 'schedule' },
  { permission: EstablishmentPermission.ESTABLISHMENT_VIEW_ORDERS, module: EstablishmentModule.ORDERS, path: 'orders' },
  { permission: EstablishmentPermission.ESTABLISHMENT_VIEW_MEMBERS, path: 'staff' },
];

export const permissionGuard = (permission: EstablishmentPermission): CanActivateFn => {
  return (route) => {
    const myMemberStore = inject(MyMemberStore);
    const modulesStore = inject(ModulesStore);
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

        /*
         * Somewhere else this person can actually go. Orders used to be the only fallback, which is
         * a dead route in an establishment that does not run that module.
         */
        const fallback = FALLBACKS.find(
          (candidate) =>
            candidate.permission !== permission &&
            myMemberStore.hasPermission(candidate.permission) &&
            (!candidate.module || modulesStore.isModuleEnabled(candidate.module)),
        );

        if (fallback) {
          return router.createUrlTree(['/establishments', cleanEstablishmentId, fallback.path]);
        }

        return router.createUrlTree(['/establishments/select']);
      }),
    );
  };
};
