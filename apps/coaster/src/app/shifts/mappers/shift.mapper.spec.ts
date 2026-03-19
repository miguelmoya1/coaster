import { asBarId, asShiftId, Shift, ShiftType, asUserId } from '@coaster/interfaces';
import { shiftArrayMapper, shiftMapper, checkIsShift } from './shift.mapper';

describe('Shift Mapper', () => {
  const validShift: Shift = {
    id: asShiftId('shift-1'),
    barId: asBarId('bar-1'),
    date: '2026-03-20',
    type: ShiftType.MORNING,
    userId: asUserId('user-1'),
  };

  it('should validate correctly', () => {
    expect(checkIsShift(validShift)).toBe(true);
    expect(checkIsShift({})).toBe(false);
    expect(checkIsShift(null)).toBe(false);
  });

  it('should map shift', () => {
    expect(shiftMapper(validShift)).toEqual(validShift);
  });

  it('should throw on invalid shift', () => {
    expect(() => shiftMapper({})).toThrow('Invalid Shift payload');
  });

  it('should map shift array', () => {
    expect(shiftArrayMapper([validShift])).toEqual([validShift]);
  });

  it('should throw on invalid shift array', () => {
    expect(() => shiftArrayMapper({})).toThrow('Expected array of Shifts');
  });
});
