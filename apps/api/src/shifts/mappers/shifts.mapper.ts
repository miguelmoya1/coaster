import type { Shift as IShift } from '@coaster/common';
import { asBarId, asShiftId, asUserId } from '../../core';
import { DbShift as ShiftDb } from '../../db';

export type ShiftWithUser = ShiftDb & { user: { id: string; name: string; photoUrl: string | null } | null };

export const ShiftsMapper = {
  toDomain(dbShift: ShiftWithUser): IShift {
    return {
      id: asShiftId(dbShift.id),
      startTime: Temporal.Instant.fromEpochMilliseconds(dbShift.startTime.getTime()).toString(),
      endTime: Temporal.Instant.fromEpochMilliseconds(dbShift.endTime.getTime()).toString(),
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
