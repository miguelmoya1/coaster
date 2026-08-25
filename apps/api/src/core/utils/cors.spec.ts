import { describe, expect, it } from 'vitest';
import { DEVELOPMENT_CORS_ORIGINS, resolveCorsOrigins } from './cors';

describe('resolveCorsOrigins', () => {
  it('should split a comma separated list and drop the whitespace around each origin', () => {
    expect(resolveCorsOrigins(' https://www.coaster.business , https://coaster.business ', true)).toEqual([
      'https://www.coaster.business',
      'https://coaster.business',
    ]);
  });

  it('should refuse every cross-origin request in production when the variable is missing', () => {
    expect(resolveCorsOrigins(undefined, true)).toEqual([]);
    expect(resolveCorsOrigins('', true)).toEqual([]);
    expect(resolveCorsOrigins('  ,  ', true)).toEqual([]);
  });

  it('should fall back to the dev server outside production, so a fresh checkout needs no configuration', () => {
    expect(resolveCorsOrigins(undefined, false)).toEqual(DEVELOPMENT_CORS_ORIGINS);
  });

  it('should honour an explicit list outside production, so beta can be reproduced locally', () => {
    expect(resolveCorsOrigins('https://beta.coaster.business', false)).toEqual(['https://beta.coaster.business']);
  });

  it('should never widen to a wildcard on its own', () => {
    expect(resolveCorsOrigins(undefined, true)).not.toContain('*');
    expect(resolveCorsOrigins(undefined, false)).not.toContain('*');
  });
});
