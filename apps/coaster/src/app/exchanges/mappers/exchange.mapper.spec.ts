import { asShiftExchangeId, asShiftId, asUserId, ShiftExchange, ShiftExchangeStatus } from '@coaster/interfaces';
import { exchangeArrayMapper, exchangeMapper, checkIsExchange } from './exchange.mapper';

describe('Exchange Mapper', () => {
  const validExchange: ShiftExchange = {
    id: asShiftExchangeId('exchange-1'),
    shiftId: asShiftId('shift-1'),
    requesterId: asUserId('user-1'),
    status: ShiftExchangeStatus.PENDING,
    requesterName: 'John',
    shiftStartTime: '2026-04-17T09:00:00.000Z',
    shiftEndTime: '2026-04-17T17:00:00.000Z',
  };

  it('should validate correctly', () => {
    expect(checkIsExchange(validExchange)).toBe(true);
    expect(checkIsExchange({})).toBe(false);
    expect(checkIsExchange(null)).toBe(false);
  });

  it('should map exchange', () => {
    expect(exchangeMapper(validExchange)).toEqual(validExchange);
  });

  it('should throw on invalid exchange', () => {
    expect(() => exchangeMapper({})).toThrow('Invalid Exchange payload');
  });

  it('should map exchange array', () => {
    expect(exchangeArrayMapper([validExchange])).toEqual([validExchange]);
  });

  it('should throw on invalid exchange array', () => {
    expect(() => exchangeArrayMapper({})).toThrow('Expected array of Exchanges');
  });
});
