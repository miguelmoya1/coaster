import { describe, expect, it } from 'vitest';
import { DEFAULT_TAX_RATE, grossFromNet, resolveTaxRate, taxOf, toBasisPoints, toPercentage } from './tax-rates';

describe('resolveTaxRate', () => {
  it('should take the product rate when it has one of its own', () => {
    expect(resolveTaxRate(2100, 1000)).toBe(2100);
  });

  it('should fall back to the category when the product has none', () => {
    expect(resolveTaxRate(null, 2100)).toBe(2100);
    expect(resolveTaxRate(undefined, 400)).toBe(400);
  });

  it('should treat a zero rate as a real answer, not as absent', () => {
    expect(resolveTaxRate(0, 2100)).toBe(0);
    expect(resolveTaxRate(null, 0)).toBe(0);
  });

  it('should land on the default only when neither says anything', () => {
    expect(resolveTaxRate(null, null)).toBe(DEFAULT_TAX_RATE);
  });
});

describe('basis points', () => {
  it('should convert a percentage a person types into whole basis points', () => {
    expect(toBasisPoints(10)).toBe(1000);
    expect(toBasisPoints(21)).toBe(2100);
    expect(toBasisPoints(4)).toBe(400);
    expect(toBasisPoints(0)).toBe(0);
  });

  it('should survive a rate with decimals without ever storing a float', () => {
    expect(toBasisPoints(10.5)).toBe(1050);
    expect(Number.isInteger(toBasisPoints(7.25))).toBe(true);
  });

  it('should read back as the percentage it came from', () => {
    for (const percentage of [0, 4, 10, 21, 10.5]) {
      expect(toPercentage(toBasisPoints(percentage))).toBe(percentage);
    }
  });
});

describe('adding the tax on top', () => {
  it('should charge the base plus its tax', () => {
    expect(taxOf(100, 1000)).toBe(10);
    expect(grossFromNet(100, 1000)).toBe(110);
    expect(grossFromNet(1000, 2100)).toBe(1210);
  });

  it('should charge the base alone at a zero rate', () => {
    expect(grossFromNet(500, 0)).toBe(500);
  });

  it('should round the tax to whole cents, never carrying a fraction', () => {
    expect(taxOf(33, 2100)).toBe(7);
    expect(Number.isInteger(grossFromNet(33, 2100))).toBe(true);
  });
});
