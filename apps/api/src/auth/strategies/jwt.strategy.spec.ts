import { Logger, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirebaseTokenService } from '@coaster/core';
import type { DbService } from '@coaster/core/db';
import { JwtStrategy } from './jwt.strategy';

const verifyIdToken = vi.fn();

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: (token: string) => verifyIdToken(token) }),
}));

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let db: { dbUser: { findUnique: ReturnType<typeof vi.fn> } };

  const activeUser = {
    id: 'user-1',
    googleId: 'google-1',
    email: 'user@establishment.com',
    name: 'Test',
    photoUrl: null,
    active: true,
    role: 'USER',
    preferences: { language: 'en' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'error').mockReturnValue(undefined);

    db = { dbUser: { findUnique: vi.fn() } };
    strategy = new JwtStrategy(new FirebaseTokenService(db as unknown as DbService));

    verifyIdToken.mockResolvedValue({ sub: 'google-1', email: 'user@establishment.com' });
  });

  it('should resolve the domain user, so callers reading user.language get the preference', async () => {
    db.dbUser.findUnique.mockResolvedValue(activeUser);

    await expect(strategy.validate('tok')).resolves.toEqual({
      id: 'user-1',
      email: 'user@establishment.com',
      name: 'Test',
      photoUrl: undefined,
      active: true,
      role: 'USER',
      language: 'en',
    });
  });

  it('should reject a user an admin has deactivated', async () => {
    db.dbUser.findUnique.mockResolvedValue({ ...activeUser, active: false });

    await expect(strategy.validate('tok')).rejects.toThrow(UnauthorizedException);
  });

  it('should reject a token whose user does not exist', async () => {
    db.dbUser.findUnique.mockResolvedValue(null);

    await expect(strategy.validate('tok')).rejects.toThrow(UnauthorizedException);
  });

  it('should reject an unverifiable token', async () => {
    verifyIdToken.mockRejectedValue(new Error('expired'));

    await expect(strategy.validate('tok')).rejects.toThrow(UnauthorizedException);
  });
});
