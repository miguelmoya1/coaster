import { DbAuthProvider } from '@coaster/core/db';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnlinkIdentityCommand } from '../impl/unlink-identity.command';
import { UnlinkIdentityHandler } from './unlink-identity.handler';

describe('UnlinkIdentityHandler', () => {
  let db: any;
  let handler: UnlinkIdentityHandler;

  beforeEach(() => {
    vi.clearAllMocks();

    db = {
      dbUser: { findUnique: vi.fn() },
      dbAuthIdentity: { deleteMany: vi.fn() },
    };

    handler = new UnlinkIdentityHandler(db);
  });

  const unlink = () => handler.execute(new UnlinkIdentityCommand('user-1', DbAuthProvider.GOOGLE));

  it('should unlink when a password is left behind to sign in with', async () => {
    db.dbUser.findUnique.mockResolvedValue({
      passwordHash: '$argon2id$...',
      identities: [{ provider: DbAuthProvider.GOOGLE }],
    });

    await expect(unlink()).resolves.toBeUndefined();

    expect(db.dbAuthIdentity.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', provider: DbAuthProvider.GOOGLE },
    });
  });

  it('should refuse to take away the only way in', async () => {
    db.dbUser.findUnique.mockResolvedValue({
      passwordHash: null,
      identities: [{ provider: DbAuthProvider.GOOGLE }],
    });

    await expect(unlink()).rejects.toThrow(BadRequestException);
    expect(db.dbAuthIdentity.deleteMany).not.toHaveBeenCalled();
  });

  it('should refuse to unlink something that was never linked', async () => {
    db.dbUser.findUnique.mockResolvedValue({ passwordHash: '$argon2id$...', identities: [] });

    await expect(unlink()).rejects.toThrow(BadRequestException);
  });

  it('should refuse for an account that does not exist', async () => {
    db.dbUser.findUnique.mockResolvedValue(null);

    await expect(unlink()).rejects.toThrow(NotFoundException);
  });
});
