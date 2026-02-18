import { createHash } from 'node:crypto';

export const hashPin = (pin: string) => {
  return createHash('sha256').update(pin).digest('hex');
};
