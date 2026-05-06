import { describe, expect, it, vi } from 'vitest';
import { PricePipe } from './price';

describe('PricePipe', () => {
  const pipe = new PricePipe();

  it('should format cents using browser locale', () => {
    const result = pipe.transform(1500);
    // Just verify it produces a non-empty string with a number
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should format zero cents', () => {
    const result = pipe.transform(0);
    expect(result).toBeTruthy();
  });

  it('should format a single cent', () => {
    const result = pipe.transform(1);
    expect(result).toBeTruthy();
  });

  it('should handle null', () => {
    expect(pipe.transform(null)).toBe('0,00 €');
  });

  it('should handle undefined', () => {
    expect(pipe.transform(undefined)).toBe('0,00 €');
  });

  it('should accept a different currency', () => {
    const result = pipe.transform(1500, 'USD');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });
});
