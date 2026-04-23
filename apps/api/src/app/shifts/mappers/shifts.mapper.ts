import { asBarId, asShiftId, asUserId, Shift as IShift } from '@coaster/interfaces';
import { Shift as ShiftDb, resolveProfileImage } from '../../core';

export type ShiftWithUser = ShiftDb & { user?: { id: string; name: string; photoUrl: string | null } };

export const ShiftsMapper = {
  toDomain(dbShift: ShiftWithUser): IShift {
    const userName = dbShift.user?.name ?? '';
    return {
      id: asShiftId(dbShift.id),
      startTime: dbShift.startTime.toISOString(),
      endTime: dbShift.endTime.toISOString(),
      userId: asUserId(dbShift.userId),
      userName,
      userImage: resolveProfileImage(dbShift.user?.photoUrl, userName || 'Unknown'),
      barId: asBarId(dbShift.barId),
      notes: dbShift.notes ?? undefined,
    };
  },

  toDto(domainEntity: IShift): IShift {
    return domainEntity;
  },
};
