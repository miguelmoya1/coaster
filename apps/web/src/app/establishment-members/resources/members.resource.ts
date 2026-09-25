import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { onRealtime, Realtime, removeById, updateLoaded } from '@coaster/core';
import { MemberRepository } from '../data-access/member-repository';
import { memberArrayMapper } from '../mappers/member.mapper';

export const membersResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(MemberRepository);
  const realtime = inject(Realtime);

  const members = httpResource(
    () => {
      const id = establishmentId();
      return id ? repository.routes.list(id) : undefined;
    },
    { parse: memberArrayMapper },
  );

  onRealtime(realtime.memberRemoved, ({ id }) => updateLoaded(members, (list) => removeById(list, id)));
  onRealtime(realtime.memberInvited, () => members.reload());
  onRealtime(realtime.memberRoleChanged, () => members.reload());

  return members;
};
