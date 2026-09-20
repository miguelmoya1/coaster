import { ErrorCodes } from '@coaster/common';
import { BadRequestException, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PWNED_PASSWORDS_ENABLED, PwnedPasswordsService } from './pwned-passwords.service';

const PASSWORD = 'password123';

const digestOf = (password: string) => createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();

const answering = (body: string, status = 200) =>
  vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, text: () => Promise.resolve(body) });

const configWith = (value?: string) => ({ get: vi.fn().mockReturnValue(value) }) as any;

describe('PwnedPasswordsService', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'warn').mockReturnValue(undefined);

    // A test must never reach the real service: the runner may well have a route to it, and the
    // passwords here are exactly the ones the corpus knows. Each test says what it wants back.
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('no network in tests'));
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('should only ever send the first five characters of the hash', async () => {
    const digest = digestOf(PASSWORD);
    const fetched = answering('');
    globalThis.fetch = fetched;

    await new PwnedPasswordsService(configWith()).compromised(PASSWORD);

    const [url, options] = fetched.mock.calls[0];

    expect(url).toBe(`https://api.pwnedpasswords.com/range/${digest.slice(0, 5)}`);
    expect(url).not.toContain(digest.slice(5));
    expect(options.headers['Add-Padding']).toBe('true');
  });

  it('should recognise a password that is already in the corpus', async () => {
    const suffix = digestOf(PASSWORD).slice(5);
    globalThis.fetch = answering(`0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${suffix}:2401761\r\n`);

    await expect(new PwnedPasswordsService(configWith()).compromised(PASSWORD)).resolves.toBe(true);
  });

  it('should let a password nobody has leaked through', async () => {
    globalThis.fetch = answering('0018A45C4D1DEF81644B54AB7F969B88D65:1\r\nA1B2C3D4E5F60718293A4B5C6D7E8F9012:9\r\n');

    await expect(new PwnedPasswordsService(configWith()).compromised(PASSWORD)).resolves.toBe(false);
  });

  it('should see the padding for what it is, since padded lines come back with no appearances', async () => {
    const suffix = digestOf(PASSWORD).slice(5);
    globalThis.fetch = answering(`${suffix}:0\r\n`);

    await expect(new PwnedPasswordsService(configWith()).compromised(PASSWORD)).resolves.toBe(false);
  });

  it('should refuse a leaked password with the code the interface knows', async () => {
    const suffix = digestOf(PASSWORD).slice(5);
    globalThis.fetch = answering(`${suffix}:12\r\n`);

    await expect(new PwnedPasswordsService(configWith()).assertNotCompromised(PASSWORD)).rejects.toThrow(
      new BadRequestException(ErrorCodes.PASSWORD_COMPROMISED),
    );
  });

  it('should say nothing about a password it could not check', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('timed out'));

    await expect(new PwnedPasswordsService(configWith()).assertNotCompromised(PASSWORD)).resolves.toBeUndefined();
  });

  describe('when the service is not answering', () => {
    it('should let the password through rather than hold up the account', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('timed out'));

      await expect(new PwnedPasswordsService(configWith()).compromised(PASSWORD)).resolves.toBe(false);
    });

    it('should do the same when it answers with an error', async () => {
      globalThis.fetch = answering('', 503);

      await expect(new PwnedPasswordsService(configWith()).compromised(PASSWORD)).resolves.toBe(false);
    });
  });

  describe('turned off', () => {
    it('should not ask at all', async () => {
      const fetched = answering('');
      globalThis.fetch = fetched;

      await expect(new PwnedPasswordsService(configWith('false')).compromised(PASSWORD)).resolves.toBe(false);

      expect(fetched).not.toHaveBeenCalled();
    });

    it('should stay on for any other value, unset included', async () => {
      const fetched = answering('');
      globalThis.fetch = fetched;

      await new PwnedPasswordsService(configWith(undefined)).compromised(PASSWORD);
      await new PwnedPasswordsService(configWith('true')).compromised(PASSWORD);

      expect(fetched).toHaveBeenCalledTimes(2);
    });

    it('should read the switch from the variable the deploy sets', () => {
      const config = configWith('false');

      new PwnedPasswordsService(config);

      expect(config.get).toHaveBeenCalledWith(PWNED_PASSWORDS_ENABLED);
    });
  });
});
