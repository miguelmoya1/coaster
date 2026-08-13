import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { EstablishmentModule, asEstablishmentId } from '@coaster/common';
import { combineLatest, filter, map, switchMap, take, timer } from 'rxjs';
import { ModulesStore } from '../store/modules.store';

export const moduleGuard = (module: EstablishmentModule): CanActivateFn => {
  return (route) => {
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

    const cleanId = asEstablishmentId(establishmentId);

    if (modulesStore.currentEstablishmentId() !== cleanId) {
      modulesStore.setEstablishmentId(cleanId);
    }

    const isLoading$ = toObservable(modulesStore.settings.isLoading);
    const currentId$ = toObservable(modulesStore.currentEstablishmentId);

    return timer(0).pipe(
      switchMap(() => combineLatest([isLoading$, currentId$])),
      filter(([isLoading, currentId]) => !isLoading && currentId === cleanId),
      take(1),
      map(() =>
        modulesStore.isModuleEnabled(module) ? true : router.createUrlTree(['/establishments', cleanId, 'dashboard']),
      ),
    );
  };
};
