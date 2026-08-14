import { ErrorCodes } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CacheService } from '@coaster/core';
import { passThroughCache } from '../../../../test/utils/passthrough-cache';
import { SyncUserCommand } from '../impl/sync-user.command';
import { SyncUserHandler } from './sync-user.handler';

const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken }),
}));

describe('SyncUserHandler', () => {
  let handler: SyncUserHandler;
  const dbUser = {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  };

  const invitedUser = {
    id: 'user-1',
    email: 'invited@establishment.com',
    googleId: null,
    name: 'Invited',
    active: true,
    role: 'USER',
    language: 'es',
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncUserHandler,
        { provide: DbService, useValue: { dbUser } },
        { provide: CacheService, useValue: passThroughCache },
      ],
    }).compile();

    handler = module.get<SyncUserHandler>(SyncUserHandler);
  });

  const signIn = (token: Record<string, unknown>) => {
    verifyIdToken.mockResolvedValue(token);
    return handler.execute(new SyncUserCommand('token'));
  };

  it('should let an invited person claim the account waiting for them', async () => {
    dbUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(invitedUser);
    dbUser.update.mockResolvedValue({ ...invitedUser, googleId: 'google-sub', active: true, role: 'USER' });

    await signIn({ sub: 'google-sub', email: 'invited@establishment.com', email_verified: true });

    expect(dbUser.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { googleId: 'google-sub' },
      include: { preferences: true },
    });
  });

  it('should refuse to claim an account from a token that does not vouch for the address', async () => {
    dbUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(invitedUser);

    await expect(
      signIn({ sub: 'google-sub', email: 'invited@establishment.com', email_verified: false }),
    ).rejects.toThrow(new UnauthorizedException(ErrorCodes.EMAIL_NOT_VERIFIED));

    expect(dbUser.update).not.toHaveBeenCalled();
  });

  it('should refuse to move an account already linked to another sign-in', async () => {
    dbUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...invitedUser, googleId: 'other-sub' });

    await expect(
      signIn({ sub: 'google-sub', email: 'invited@establishment.com', email_verified: true }),
    ).rejects.toThrow(new UnauthorizedException(ErrorCodes.EMAIL_ALREADY_LINKED));

    expect(dbUser.update).not.toHaveBeenCalled();
  });

  it('should return the user matched by their sign-in id without touching the email path', async () => {
    const existing = {
      id: 'user-1',
      email: 'known@establishment.com',
      googleId: 'google-sub',
      name: 'Known',
      photoUrl: null,
      active: true,
      role: 'USER',
      language: 'es',
    };
    dbUser.findUnique.mockResolvedValueOnce(existing);

    const result = await signIn({
      sub: 'google-sub',
      email: 'known@establishment.com',
      name: 'Known',
      email_verified: true,
    });

    expect(result).toEqual({
      id: 'user-1',
      email: 'known@establishment.com',
      name: 'Known',
      photoUrl: undefined,
      active: true,
      role: 'USER',
      language: 'es',
    });
    expect(dbUser.findUnique).toHaveBeenCalledTimes(1);
  });

  it('should create a brand new user when nothing matches', async () => {
    dbUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    dbUser.create.mockResolvedValue({
      id: 'user-2',
      email: 'new@establishment.com',
      name: 'new',
      active: true,
      role: 'USER',
    });

    await signIn({ sub: 'new-sub', email: 'new@establishment.com', email_verified: true });

    expect(dbUser.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'new@establishment.com',
        googleId: 'new-sub',
        preferences: { create: {} },
      }),
      include: { preferences: true },
    });
  });

  it('should reject a token with no email on it', async () => {
    await expect(signIn({ sub: 'google-sub' })).rejects.toThrow(
      new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS),
    );
  });
});
