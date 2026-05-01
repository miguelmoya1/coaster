import { describe, expect, it, test } from 'vitest';
import { asBarId, asShiftId, asUserId, Shift } from '@coaster/common';
import { checkIsShift, shiftArrayMapper, shiftMapper } from './shift.mapper';

describe('ShiftMapper', () => {
  const validShift: Shift = {
    id: asShiftId('shift-1'),
    barId: asBarId('bar-1'),
    startTime: '2026-03-20T08:00:00Z',
    endTime: '2026-03-20T16:00:00Z',
    userId: asUserId('user-1'),
    userName: 'Test User',
    userImage: 'https://photo.url/test.jpg',
  };

  describe('checkIsShift', () => {
    it('should return true for a valid shift model', () => {
      expect(checkIsShift(validShift)).toBe(true);
    });

    it('should return false for null or non-object', () => {
      expect(checkIsShift(null)).toBe(false);
      expect(checkIsShift(undefined)).toBe(false);
      expect(checkIsShift('string')).toBe(false);
      expect(checkIsShift(123)).toBe(false);
    });

    it('should return false if required fields are missing', () => {
      const { id: _id, ...missingId } = validShift;
      const { startTime: _startTime, ...missingStart } = validShift;
      const { endTime: _endTime, ...missingEnd } = validShift;
      const { userName: _userName, ...missingUser } = validShift;

      expect(checkIsShift(missingId)).toBe(false);
      expect(checkIsShift(missingStart)).toBe(false);
      expect(checkIsShift(missingEnd)).toBe(false);
      expect(checkIsShift(missingUser)).toBe(false);
    });
  });

  describe('shiftMapper', () => {
    it('should map a valid shift object', () => {
      const result = shiftMapper(validShift);
      expect(result).toEqual(validShift);
      expect(result).not.toBe(validShift); // Ensure it's a new object
    });

    it('should throw an error for an invalid shift object', () => {
      expect(() => shiftMapper({})).toThrow('Invalid Shift payload');
    });
  });

  describe('shiftArrayMapper', () => {
    it('should map an array of valid shifts', () => {
      const shifts = [validShift, { ...validShift, id: asShiftId('shift-2') }];
      const result = shiftArrayMapper(shifts);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(validShift);
      expect(result[1].id).toBe('shift-2');
    });

    it('should throw an error if input is not an array', () => {
      expect(() => shiftArrayMapper(null)).toThrow('Expected array of Shifts');
      expect(() => shiftArrayMapper({})).toThrow('Expected array of Shifts');
    });

    it('should throw an error if any element in the array is invalid', () => {
      expect(() => shiftArrayMapper([validShift, {}])).toThrow('Invalid Shift payload');
    });
  });
});
