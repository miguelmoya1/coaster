import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { EstablishmentModule } from '@coaster/common';
import { establishmentIdIn } from '@coaster/core';
import { ModulesStore } from '../store/modules.store';

export const moduleGuard =
  (module: EstablishmentModule): CanActivateFn =>
  async (route) => {
    const modulesStore = inject(ModulesStore);
    const router = inject(Router);

    const establishmentId = establishmentIdIn(route);
    if (!establishmentId) {
      throw new RedirectCommand(router.createUrlTree(['/establishments/select']));
    }

    await modulesStore.loadedFor(establishmentId);

    if (!modulesStore.isModuleEnabled(module)) {
      throw new RedirectCommand(router.createUrlTree(['/establishments', establishmentId, 'dashboard']));
    }

    return true;
  };
