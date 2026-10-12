import { describe, expect, it } from 'vitest';
import { flagOf, oneOf, pageOf, searchOf, totalPagesOf } from './list-query';

describe('list query', () => {
  it('should read the page from the URL and fall back to the first on anything odd', () => {
    expect(pageOf('3')).toBe(3);
    expect(pageOf(undefined)).toBe(1);
    expect(pageOf('0')).toBe(1);
    expect(pageOf('abc')).toBe(1);
    expect(pageOf('2.5')).toBe(1);
  });

  it('should keep only values it knows', () => {
    expect(oneOf(['STRIPE', 'MANUAL'] as const, 'MANUAL')).toBe('MANUAL');
    expect(oneOf(['STRIPE', 'MANUAL'] as const, 'FREE')).toBeUndefined();
  });

  it('should read yes, no and nothing', () => {
    expect(flagOf('true')).toBe(true);
    expect(flagOf('false')).toBe(false);
    expect(flagOf(undefined)).toBeUndefined();
  });

  it('should ignore a search made only of spaces', () => {
    expect(searchOf('  ')).toBeUndefined();
    expect(searchOf(' bar ')).toBe('bar');
  });

  it('should never count fewer than one page', () => {
    expect(totalPagesOf(0, 20)).toBe(1);
    expect(totalPagesOf(41, 20)).toBe(3);
  });
});
