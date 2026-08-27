import { randomBytes } from 'crypto';
import { describe, expect, it } from 'vitest';
import { MissingEncryptionKey, open, readKey, seal } from './secret-box';

const key = randomBytes(32);

describe('secret box', () => {
  it('gives back exactly what was sealed', () => {
    expect(open(seal('fk_una_clave_de_socio', key), key)).toBe('fk_una_clave_de_socio');
  });

  it('never produces the same ciphertext twice, so two equal keys do not look equal', () => {
    expect(seal('fk_1', key)).not.toBe(seal('fk_1', key));
  });

  it('refuses to open with the wrong key instead of returning rubbish', () => {
    const sealed = seal('fk_1', key);

    expect(() => open(sealed, randomBytes(32))).toThrow();
  });

  it('refuses to open something that was tampered with', () => {
    const sealed = Buffer.from(seal('fk_1', key), 'base64');
    sealed[sealed.length - 1] ^= 0xff;

    expect(() => open(sealed.toString('base64'), key)).toThrow();
  });

  it('demands a key of exactly 32 bytes', () => {
    expect(() => readKey(undefined)).toThrow(MissingEncryptionKey);
    expect(() => readKey('')).toThrow(MissingEncryptionKey);
    expect(() => readKey(randomBytes(16).toString('base64'))).toThrow(MissingEncryptionKey);
    expect(readKey(key.toString('base64'))).toHaveLength(32);
  });
});
