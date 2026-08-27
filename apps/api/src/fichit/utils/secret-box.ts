import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class MissingEncryptionKey extends Error {
  constructor() {
    super('SETTINGS_ENCRYPTION_KEY no está configurada o no son 32 bytes');
    this.name = 'MissingEncryptionKey';
  }
}

export const readKey = (raw: string | undefined): Buffer => {
  const key = Buffer.from(raw ?? '', 'base64');
  if (key.length !== 32) {
    throw new MissingEncryptionKey();
  }
  return key;
};

export const seal = (plain: string, key: Buffer): string => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);

  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
};

export const open = (sealed: string, key: Buffer): string => {
  const raw = Buffer.from(sealed, 'base64');
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const body = raw.subarray(IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
};
