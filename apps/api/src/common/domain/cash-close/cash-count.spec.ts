import { describe, expect, it } from 'vitest';
import { cashDifferenceOf, expectedCashOf } from './cash-count';

describe('cash count', () => {
  it('should expect the float plus what was taken in cash', () => {
    expect(expectedCashOf(15000, 42050)).toBe(57050);
  });

  it('should be zero when the drawer holds exactly what it should', () => {
    expect(cashDifferenceOf(57050, 15000, 42050)).toBe(0);
  });

  it('should go negative when cash is missing and positive when there is too much', () => {
    expect(cashDifferenceOf(56050, 15000, 42050)).toBe(-1000);
    expect(cashDifferenceOf(57550, 15000, 42050)).toBe(500);
  });
});
