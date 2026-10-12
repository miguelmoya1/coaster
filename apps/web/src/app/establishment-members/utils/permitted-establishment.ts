import { computed, inject, type Signal } from '@angular/core';
import type { EstablishmentId } from '@coaster/core';
import type { EstablishmentPermission } from '../models/establishment-permissions.type';
import { MyMemberStore } from '../store/my-member.store';

export const permittedEstablishmentId = (
  establishmentId: Signal<EstablishmentId | undefined>,
  permission: EstablishmentPermission,
): Signal<EstablishmentId | undefined> => {
  const member = inject(MyMemberStore);

  return computed(() => (member.hasPermission(permission) ? establishmentId() : undefined));
};
