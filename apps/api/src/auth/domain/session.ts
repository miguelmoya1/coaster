import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const REFRESH_COOKIE_NAME = 'coaster_session';

export const REFRESH_COOKIE_PATH = '/api/v1/auth';

export const REFRESH_TOKEN_TTL_DAYS = 30;

export const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

export const REFRESH_REUSE_GRACE_SECONDS = 30;

export const newRefreshToken = (): string => randomBytes(32).toString('base64url');

export const newFamilyId = (): string => randomUUID();

export const hashRefreshToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export const refreshExpiryFrom = (now: Date): Date => new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000);

export const isWithinReuseGrace = (rotatedAt: Date, now: Date): boolean =>
  now.getTime() - rotatedAt.getTime() <= REFRESH_REUSE_GRACE_SECONDS * 1000;
