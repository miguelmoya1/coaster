import 'reflect-metadata';

import { FirebaseAuthGuard } from '@coaster/auth';
import { ADMIN_KEY, AdminGuard } from '@coaster/core';
import { PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { AdminControllers } from './index';

type Ctor = new (...args: never[]) => unknown;

const guardsOf = (target: object): unknown[] => (Reflect.getMetadata('__guards__', target) as unknown[]) ?? [];

const isAdminRequired = (target: object): boolean => Reflect.getMetadata(ADMIN_KEY, target) === true;

const handlersOf = (controller: Ctor): [string, (...args: never[]) => unknown][] =>
  Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => [name, (controller.prototype as Record<string, (...args: never[]) => unknown>)[name]])
    .filter(([, fn]) => typeof fn === 'function');

describe('admin controllers are locked down', () => {
  it('should register every admin controller under the admin path', () => {
    expect(AdminControllers.length).toBeGreaterThan(0);

    for (const controller of AdminControllers as unknown as Ctor[]) {
      const path = Reflect.getMetadata(PATH_METADATA, controller) as string;
      expect(path === 'admin' || path.startsWith('admin/')).toBe(true);
    }
  });

  describe.each((AdminControllers as unknown as Ctor[]).map((c) => [c.name, c] as const))('%s', (_name, controller) => {
    it('should require the ADMIN role at the class level', () => {
      expect(isAdminRequired(controller)).toBe(true);
    });

    it('should authenticate before it authorises', () => {
      const guards = guardsOf(controller);

      expect(guards).toContain(FirebaseAuthGuard);
      expect(guards).toContain(AdminGuard);
      expect(guards.indexOf(FirebaseAuthGuard)).toBeLessThan(guards.indexOf(AdminGuard));
    });

    it('should not let any route opt out of the admin check', () => {
      for (const [name, handler] of handlersOf(controller)) {
        const optedOut = Reflect.getMetadata(ADMIN_KEY, handler) === false;
        expect(optedOut, `${_name}.${name} opts out of @Admin()`).toBe(false);

        const handlerGuards = guardsOf(handler);
        if (handlerGuards.length > 0) {
          expect(handlerGuards, `${_name}.${name} overrides guards without AdminGuard`).toContain(AdminGuard);
        }
      }
    });
  });
});
