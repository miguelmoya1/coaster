import { randomInt } from 'crypto';

/** No vowels and no 0/1/O/I: the code is read off a filename and typed back by hand when it is not. */
const ALPHABET = '23456789BCDFGHJKLMNPQRSTVWXZ';

export const PAIRING_CODE_LENGTH = 8;
export const PAIRING_TTL_MINUTES = 60;

export const newPairingCode = (): string =>
  Array.from({ length: PAIRING_CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

export const pairingExpiry = (from = new Date()): Date => new Date(from.getTime() + PAIRING_TTL_MINUTES * 60 * 1000);

/**
 * Browsers rename a repeated download to `name (1).exe`, and people move files about. Anything that
 * is not a code character is noise, so the code is recovered rather than matched exactly.
 */
export const codeFromFilename = (filename: string): string | null => {
  const match = /coaster-printer-([2-9BCDFGHJKLMNPQRSTVWXZ]{8})/i.exec(filename);

  return match ? match[1].toUpperCase() : null;
};
