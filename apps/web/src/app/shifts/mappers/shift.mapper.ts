import { Shift } from '@coaster/common';
import { prepareDefaultProfileImage } from '@coaster/core';

export type MappedShift = Shift & { userImage: string };

export const checkIsShift = (shift: unknown): shift is Shift => {
  return (
    typeof shift === 'object' &&
    shift !== null &&
    'id' in shift &&
    'startTime' in shift &&
    'endTime' in shift &&
    'userName' in shift
  );
};

export const shiftMapper = (shift: unknown): MappedShift => {
  if (!checkIsShift(shift)) {
    throw new Error('Invalid Shift payload');
  }
  return {
    ...shift,
    userImage: prepareDefaultProfileImage(shift.userImage, shift.userName),
  };
};

export const shiftArrayMapper = (shifts: unknown): MappedShift[] => {
  if (!Array.isArray(shifts)) throw new Error('Expected array of Shifts');
  return shifts.map(shiftMapper);
};
