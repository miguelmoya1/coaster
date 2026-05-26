import { asBarId, asShiftId, asUserId, Shift as IShift } from '@coaster/common';

import { Shift as ShiftDb } from '../../core';

export type ShiftWithUser = ShiftDb & { user: { id: string; name: string; photoUrl: string | null } | null };

export const ShiftsMapper = {
  toDomain(dbShift: ShiftWithUser): IShift {
    return {
      id: asShiftId(dbShift.id),
      startTime: dbShift.startTime.toISOString(),
      endTime: dbShift.endTime.toISOString(),
      userId: asUserId(dbShift.userId),
      userName: dbShift.user?.name ?? '',
      userImage: dbShift.user?.photoUrl ?? undefined,
      barId: asBarId(dbShift.barId),
      notes: dbShift.notes ?? undefined,
    };
  },

  toDto(domainEntity: IShift): IShift {
    return domainEntity;
  },
};
