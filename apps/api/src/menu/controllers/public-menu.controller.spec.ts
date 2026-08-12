import { describe, expect, it } from 'vitest';
import { MenuController } from './menu.controller';
import { PublicMenuController } from './public-menu.controller';

describe('PublicMenuController', () => {
  const guardsOn = (target: object) => (Reflect.getMetadata('__guards__', target) ?? []) as unknown[];

  it('should carry no guards, since a customer scanning a QR has no account', () => {
    expect(guardsOn(PublicMenuController)).toEqual([]);
  });

  it('should carry its own rate limit rather than inherit the authenticated one', () => {
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', PublicMenuController)).toBeDefined();
  });

  it('should not be confused with the authoring controller, which is guarded', () => {
    expect(guardsOn(MenuController).length).toBeGreaterThan(0);
  });
});
