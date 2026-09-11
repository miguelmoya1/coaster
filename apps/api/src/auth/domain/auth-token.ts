import { createHash, randomBytes } from 'node:crypto';
import { DbAuthTokenPurpose } from '@coaster/core/db';

export const TOKEN_LIFETIME_HOURS: Record<DbAuthTokenPurpose, number> = {
  [DbAuthTokenPurpose.EMAIL_VERIFICATION]: 24,
  [DbAuthTokenPurpose.PASSWORD_RESET]: 1,
  [DbAuthTokenPurpose.INVITE]: 7 * 24,
};

export const newAuthToken = (): string => randomBytes(32).toString('base64url');

export const hashAuthToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export const expiryFor = (purpose: DbAuthTokenPurpose, now: Date): Date =>
  new Date(now.getTime() + TOKEN_LIFETIME_HOURS[purpose] * 60 * 60 * 1000);
