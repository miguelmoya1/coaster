import { DbAuthTokenPurpose } from '@coaster/core/db';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expiryFor, hashAuthToken, newAuthToken, TOKEN_LIFETIME_HOURS } from './auth-token';

describe('auth token', () => {
  it('should mint 256 random bits, which is what makes a fast hash enough to store it', () => {
    const token = newAuthToken();

    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    expect(newAuthToken()).not.toBe(token);
  });

  it('should hash the same token to the same value, or the row could never be found by its hash', () => {
    const token = newAuthToken();

    expect(hashAuthToken(token)).toBe(hashAuthToken(token));
    expect(hashAuthToken(token)).not.toBe(hashAuthToken(newAuthToken()));
  });

  it('should be plain sha256, not a salted password hash, because this is a lookup key and not a password', () => {
    const token = newAuthToken();

    expect(hashAuthToken(token)).toBe(createHash('sha256').update(token).digest('hex'));
  });

  it('should give every purpose the lifetime the table says', () => {
    const now = new Date('2026-09-11T10:00:00Z');

    expect(expiryFor(DbAuthTokenPurpose.PASSWORD_RESET, now)).toEqual(new Date('2026-09-11T11:00:00Z'));
    expect(expiryFor(DbAuthTokenPurpose.EMAIL_VERIFICATION, now)).toEqual(new Date('2026-09-12T10:00:00Z'));
    expect(expiryFor(DbAuthTokenPurpose.INVITE, now)).toEqual(new Date('2026-09-18T10:00:00Z'));
    expect(TOKEN_LIFETIME_HOURS[DbAuthTokenPurpose.PASSWORD_RESET]).toBeLessThan(
      TOKEN_LIFETIME_HOURS[DbAuthTokenPurpose.EMAIL_VERIFICATION],
    );
  });
});
