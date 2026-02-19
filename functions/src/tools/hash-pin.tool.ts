import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const createSaltAndHash = (pin: string) => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 64).toString('hex');

  return { salt, hash };
};

export const verifyPin = (pin: string, salt: string, storedHash: string): boolean => {
  const inputHash = scryptSync(pin, salt, 64).toString('hex');

  return timingSafeEqual(Buffer.from(storedHash), Buffer.from(inputHash));
};
