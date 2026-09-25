import { computed, inject, type Signal } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { EstablishmentModule, EstablishmentPermission } from '@coaster/common';
import { MyMemberStore } from '@coaster/establishment-members';
import { ModulesStore } from '@coaster/establishments';

export interface DashboardAccess {
  permission: EstablishmentPermission;
  module?: EstablishmentModule;
}

export const DASHBOARD_ACCESS = {
  billing: { permission: EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING },
  takings: { permission: EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS, module: EstablishmentModule.ORDERS },
  takingsHistory: {
    permission: EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS_HISTORY,
    module: EstablishmentModule.ORDERS,
  },
  inventory: { permission: EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS, module: EstablishmentModule.INVENTORY },
  team: { permission: EstablishmentPermission.ESTABLISHMENT_CREATE_SHIFT },
  clock: { permission: EstablishmentPermission.ESTABLISHMENT_CLOCK_IN },
} as const satisfies Record<string, DashboardAccess>;

export const canAccess = (access: DashboardAccess, member: MyMemberStore, modules: ModulesStore): boolean =>
  member.hasPermission(access.permission) && (!access.module || modules.isModuleEnabled(access.module));

export const accessibleEstablishmentId = (
  establishmentId: Signal<EstablishmentId | undefined>,
  access: DashboardAccess,
): Signal<EstablishmentId | undefined> => {
  const member = inject(MyMemberStore);
  const modules = inject(ModulesStore);

  return computed(() => (canAccess(access, member, modules) ? establishmentId() : undefined));
};
