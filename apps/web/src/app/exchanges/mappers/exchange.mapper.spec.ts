import { describe, expect, it } from 'vitest';
import { asShiftExchangeId, asShiftId, asUserId, ShiftExchange, ShiftExchangeStatus } from '@coaster/common';
import { checkIsExchange, exchangeArrayMapper, exchangeMapper } from './exchange.mapper';

describe('Exchange Mapper', () => {
  const validExchange: ShiftExchange = {
    id: asShiftExchangeId('exchange-1'),
    shiftId: asShiftId('shift-1'),
    requesterId: asUserId('user-1'),
    status: ShiftExchangeStatus.PENDING,
    requesterName: 'John',
    shiftStartTime: '2026-04-17T09:00:00.000Z',
    shiftEndTime: '2026-04-17T17:00:00.000Z',
    createdAt: new Date(),
  };

  describe('checkIsExchange', () => {
    it('should return true for valid exchange', () => {
      expect(checkIsExchange(validExchange)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(checkIsExchange(null)).toBe(false);
      expect(checkIsExchange({})).toBe(false);
      expect(checkIsExchange({ id: '1' })).toBe(false);
    });
  });

  describe('exchangeMapper', () => {
    it('should map a valid exchange', () => {
      expect(exchangeMapper(validExchange)).toEqual(validExchange);
    });

    it('should throw Error for invalid exchange', () => {
      expect(() => exchangeMapper({})).toThrow('Invalid Exchange payload');
    });
  });

  describe('exchangeArrayMapper', () => {
    it('should map valid array of exchanges', () => {
      expect(exchangeArrayMapper([validExchange])).toEqual([validExchange]);
    });

    it('should return empty array for empty input', () => {
      expect(exchangeArrayMapper([])).toEqual([]);
    });

    it('should throw Error if input is not an array', () => {
      expect(() => exchangeArrayMapper({})).toThrow('Expected array of Exchanges');
    });
  });
});
