import { computed, inject, type Signal } from '@angular/core';
import type { EstablishmentId, EstablishmentPermission } from '@coaster/common';
import { MyMemberStore } from '../store/my-member.store';

export const permittedEstablishmentId = (
  establishmentId: Signal<EstablishmentId | undefined>,
  permission: EstablishmentPermission,
): Signal<EstablishmentId | undefined> => {
  const member = inject(MyMemberStore);

  return computed(() => (member.hasPermission(permission) ? establishmentId() : undefined));
};
