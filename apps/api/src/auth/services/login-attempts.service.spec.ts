import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOGIN_FAILURE_LIMIT, LOGIN_LOCK_SECONDS, LoginAttemptsService } from './login-attempts.service';

const EMAIL = 'someone@coaster.test';

describe('LoginAttemptsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);
  });

  describe('with a cache, which is how it counts across every instance', () => {
    let client: any;
    let failures: number;
    let service: LoginAttemptsService;

    beforeEach(() => {
      failures = 0;
      client = {
        defineCommand: vi.fn(),
        del: vi.fn().mockResolvedValue(1),
        countLoginFailure: vi.fn().mockImplementation(() => Promise.resolve([++failures, LOGIN_LOCK_SECONDS])),
        readLoginFailures: vi.fn().mockImplementation(() => Promise.resolve([failures, LOGIN_LOCK_SECONDS])),
      };
      service = new LoginAttemptsService({ client } as any);
    });

    it('should teach the cache both scripts once, at startup', () => {
      expect(client.defineCommand).toHaveBeenCalledTimes(2);
      expect(client.defineCommand.mock.calls.map(([name]: [string]) => name)).toEqual([
        'countLoginFailure',
        'readLoginFailures',
      ]);
    });

    it('should never hand the address itself to the cache', async () => {
      await service.remember(EMAIL);

      expect(client.countLoginFailure.mock.calls[0][0]).not.toContain(EMAIL);
      expect(client.countLoginFailure.mock.calls[0][0]).toMatch(/^auth:login-failures:[0-9a-f]{64}$/);
    });

    it('should key the same address the same way however it is typed', async () => {
      await service.remember(EMAIL);
      await service.remember('  SomeOne@Coaster.TEST ');

      const [[first], [second]] = client.countLoginFailure.mock.calls;

      expect(second).toBe(first);
    });

    it('should let an address through until it has used up its attempts', async () => {
      for (let attempt = 1; attempt < LOGIN_FAILURE_LIMIT; attempt++) {
        await service.remember(EMAIL);

        await expect(service.lockedFor(EMAIL)).resolves.toBe(0);
      }

      await service.remember(EMAIL);

      await expect(service.lockedFor(EMAIL)).resolves.toBe(LOGIN_LOCK_SECONDS);
    });

    it('should drop the run when the address is cleared', async () => {
      await service.forget(EMAIL);

      expect(client.del).toHaveBeenCalledWith(expect.stringMatching(/^auth:login-failures:/));
    });

    it('should carry on counting in memory when the cache is down', async () => {
      client.countLoginFailure.mockRejectedValue(new Error('connection is closed'));
      client.readLoginFailures.mockRejectedValue(new Error('connection is closed'));

      for (let attempt = 0; attempt < LOGIN_FAILURE_LIMIT; attempt++) {
        await service.remember(EMAIL);
      }

      await expect(service.lockedFor(EMAIL)).resolves.toBeGreaterThan(0);
    });
  });

  describe('without a cache, which is how beta runs today', () => {
    let service: LoginAttemptsService;

    beforeEach(() => {
      service = new LoginAttemptsService({ client: null } as any);
    });

    it('should let an address that has done nothing wrong through', async () => {
      await expect(service.lockedFor(EMAIL)).resolves.toBe(0);
    });

    it('should turn the address away once it reaches the limit', async () => {
      for (let attempt = 1; attempt < LOGIN_FAILURE_LIMIT; attempt++) {
        await service.remember(EMAIL);
      }

      await expect(service.lockedFor(EMAIL)).resolves.toBe(0);

      await service.remember(EMAIL);

      await expect(service.lockedFor(EMAIL)).resolves.toBeGreaterThan(0);
    });

    it('should count each address on its own', async () => {
      for (let attempt = 0; attempt < LOGIN_FAILURE_LIMIT; attempt++) {
        await service.remember(EMAIL);
      }

      await expect(service.lockedFor('somebody-else@coaster.test')).resolves.toBe(0);
    });

    it('should forget the run when somebody finally gets in', async () => {
      for (let attempt = 0; attempt < LOGIN_FAILURE_LIMIT; attempt++) {
        await service.remember(EMAIL);
      }

      await service.forget(EMAIL);

      await expect(service.lockedFor(EMAIL)).resolves.toBe(0);
    });

    it('should let the address try again once the lock has run out', async () => {
      vi.useFakeTimers();

      try {
        for (let attempt = 0; attempt < LOGIN_FAILURE_LIMIT; attempt++) {
          await service.remember(EMAIL);
        }

        await expect(service.lockedFor(EMAIL)).resolves.toBeGreaterThan(0);

        vi.advanceTimersByTime((LOGIN_LOCK_SECONDS + 1) * 1000);

        await expect(service.lockedFor(EMAIL)).resolves.toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
