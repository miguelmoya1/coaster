import { randomInt } from 'crypto';

const ALPHABET = '23456789BCDFGHJKLMNPQRSTVWXZ';

export const PAIRING_CODE_LENGTH = 8;
export const PAIRING_TTL_MINUTES = 60;

export const newPairingCode = (): string =>
  Array.from({ length: PAIRING_CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

export const pairingExpiry = (from = new Date()): Date => new Date(from.getTime() + PAIRING_TTL_MINUTES * 60 * 1000);

export const codeFromFilename = (filename: string): string | null => {
  const match = /coaster-printer-([2-9BCDFGHJKLMNPQRSTVWXZ]{8})/i.exec(filename);

  return match ? match[1].toUpperCase() : null;
};
