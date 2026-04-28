import { describe, expect, it } from 'vitest';
import { BarRole, ShiftExchangeStatus } from './enums';

describe('Enums', () => {
  it('should have all error codes', () => {
    expect(Object.keys(BarRole).length).toBe(2);
    expect(Object.keys(ShiftExchangeStatus).length).toBe(3);
  });
});
