import { ErrorCodes } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  const dbBetaTester = { findUnique: vi.fn() };
  const config = { get: vi.fn() };

  const closeTheBeta = () => config.get.mockReturnValue('true');

  const invitedUser = {
    id: 'user-1',
    email: 'invited@establishment.com',
    firebaseUid: null,
    name: 'Invited',
    active: true,
    role: 'USER',
    language: 'es',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    config.get.mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncUserHandler,
        { provide: DbService, useValue: { dbUser, dbBetaTester } },
        { provide: CacheService, useValue: passThroughCache },
        { provide: ConfigService, useValue: config },
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
    dbUser.update.mockResolvedValue({ ...invitedUser, firebaseUid: 'firebase-sub', active: true, role: 'USER' });

    await signIn({ sub: 'firebase-sub', email: 'invited@establishment.com', email_verified: true });

    expect(dbUser.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { firebaseUid: 'firebase-sub' },
      include: { preferences: true },
    });
  });

  it('should refuse to claim an account from a token that does not vouch for the address', async () => {
    dbUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(invitedUser);

    await expect(
      signIn({ sub: 'firebase-sub', email: 'invited@establishment.com', email_verified: false }),
    ).rejects.toThrow(new UnauthorizedException(ErrorCodes.EMAIL_NOT_VERIFIED));

    expect(dbUser.update).not.toHaveBeenCalled();
  });

  it('should refuse to move an account already linked to another sign-in', async () => {
    dbUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...invitedUser, firebaseUid: 'other-sub' });

    await expect(
      signIn({ sub: 'firebase-sub', email: 'invited@establishment.com', email_verified: true }),
    ).rejects.toThrow(new UnauthorizedException(ErrorCodes.EMAIL_ALREADY_LINKED));

    expect(dbUser.update).not.toHaveBeenCalled();
  });

  it('should return the user matched by their sign-in id without touching the email path', async () => {
    const existing = {
      id: 'user-1',
      email: 'known@establishment.com',
      firebaseUid: 'firebase-sub',
      name: 'Known',
      photoUrl: null,
      active: true,
      role: 'USER',
      language: 'es',
    };
    dbUser.findUnique.mockResolvedValueOnce(existing);

    const result = await signIn({
      sub: 'firebase-sub',
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
        firebaseUid: 'new-sub',
        preferences: { create: {} },
      }),
      include: { preferences: true },
    });
  });

  it('should refuse a brand new account when the allowlist is on and the email is not on it', async () => {
    closeTheBeta();
    dbUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    dbBetaTester.findUnique.mockResolvedValue(null);

    await expect(signIn({ sub: 'new-sub', email: 'stranger@establishment.com', email_verified: true })).rejects.toThrow(
      new ForbiddenException(ErrorCodes.BETA_ACCESS_REQUIRED),
    );

    expect(dbUser.create).not.toHaveBeenCalled();
  });

  it('should let a brand new account through when the email is on the allowlist', async () => {
    closeTheBeta();
    dbUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    dbBetaTester.findUnique.mockResolvedValue({ id: 'beta-1', email: 'tester@establishment.com' });
    dbUser.create.mockResolvedValue({
      id: 'user-3',
      email: 'tester@establishment.com',
      name: 'tester',
      active: true,
      role: 'USER',
    });

    await signIn({ sub: 'new-sub', email: 'Tester@Establishment.com', email_verified: true });

    expect(dbBetaTester.findUnique).toHaveBeenCalledWith({ where: { email: 'tester@establishment.com' } });
    expect(dbUser.create).toHaveBeenCalled();
  });

  it('should let an invited employee in without asking the allowlist', async () => {
    closeTheBeta();
    dbUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(invitedUser);
    dbUser.update.mockResolvedValue({ ...invitedUser, firebaseUid: 'firebase-sub' });

    await signIn({ sub: 'firebase-sub', email: 'invited@establishment.com', email_verified: true });

    expect(dbBetaTester.findUnique).not.toHaveBeenCalled();
    expect(dbUser.update).toHaveBeenCalled();
  });

  it('should not consult the allowlist while the beta is open', async () => {
    dbUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    dbUser.create.mockResolvedValue({
      id: 'user-4',
      email: 'anyone@establishment.com',
      name: 'anyone',
      active: true,
      role: 'USER',
    });

    await signIn({ sub: 'new-sub', email: 'anyone@establishment.com', email_verified: true });

    expect(dbBetaTester.findUnique).not.toHaveBeenCalled();
    expect(dbUser.create).toHaveBeenCalled();
  });

  it('should reject a token with no email on it', async () => {
    await expect(signIn({ sub: 'firebase-sub' })).rejects.toThrow(
      new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS),
    );
  });
});
