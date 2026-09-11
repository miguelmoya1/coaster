import { describe, expect, it } from 'vitest';
import { burnVerificationTime, hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('should hash with argon2id at the parameters OWASP asks for', async () => {
    const hashed = await hashPassword('a-good-enough-password');

    expect(hashed.startsWith('$argon2id$v=19$m=19456,t=2,p=1$')).toBe(true);
  });

  it('should salt every hash, so the same password never lands twice the same', async () => {
    const [first, second] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')]);

    expect(first).not.toBe(second);
  });

  it('should accept the password it hashed', async () => {
    const hashed = await hashPassword('a-good-enough-password');

    await expect(verifyPassword(hashed, 'a-good-enough-password')).resolves.toBe(true);
  });

  it('should reject a different password', async () => {
    const hashed = await hashPassword('a-good-enough-password');

    await expect(verifyPassword(hashed, 'a-good-enough-passwore')).resolves.toBe(false);
  });

  it('should answer false rather than throw when the stored hash is not a hash', async () => {
    await expect(verifyPassword('not-a-hash', 'whatever')).resolves.toBe(false);
  });

  it('should spend the same kind of time when there is nobody to check against', async () => {
    await expect(burnVerificationTime()).resolves.toBe(false);
  });
});
