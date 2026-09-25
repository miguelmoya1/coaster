import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { EstablishmentModule, EstablishmentPermission } from '@coaster/common';
import { establishmentIdIn } from '@coaster/core';
import { ModulesStore } from '@coaster/establishments';
import { MyMemberStore } from '../store/my-member.store';

const FALLBACKS: { permission: EstablishmentPermission; module?: EstablishmentModule; path: string }[] = [
  { permission: EstablishmentPermission.ESTABLISHMENT_VIEW_DASHBOARD, path: 'dashboard' },
  { permission: EstablishmentPermission.ESTABLISHMENT_VIEW_SHIFTS, path: 'schedule' },
  { permission: EstablishmentPermission.ESTABLISHMENT_VIEW_ORDERS, module: EstablishmentModule.ORDERS, path: 'orders' },
  { permission: EstablishmentPermission.ESTABLISHMENT_VIEW_MEMBERS, path: 'staff' },
];

export const permissionGuard =
  (permission: EstablishmentPermission): CanActivateFn =>
  async (route) => {
    const myMemberStore = inject(MyMemberStore);
    const modulesStore = inject(ModulesStore);
    const router = inject(Router);

    const establishmentId = establishmentIdIn(route);
    if (!establishmentId) {
      throw new RedirectCommand(router.createUrlTree(['/establishments/select']));
    }

    await myMemberStore.loadedFor(establishmentId);

    if (myMemberStore.hasPermission(permission)) {
      return true;
    }

    const fallback = FALLBACKS.find(
      (candidate) =>
        candidate.permission !== permission &&
        myMemberStore.hasPermission(candidate.permission) &&
        (!candidate.module || modulesStore.isModuleEnabled(candidate.module)),
    );

    throw new RedirectCommand(
      router.createUrlTree(fallback ? ['/establishments', establishmentId, fallback.path] : ['/establishments/select']),
    );
  };
