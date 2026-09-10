import { DbAuthTokenPurpose } from '@coaster/core/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthTokenRepository } from './auth-token.repository';
import { hashAuthToken } from '../domain/auth-token';

describe('AuthTokenRepository', () => {
  let db: any;
  let repo: AuthTokenRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    db = {
      dbAuthToken: {
        create: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn(),
      },
      $transaction: vi.fn().mockResolvedValue([{ count: 0 }, {}]),
    };

    repo = new AuthTokenRepository(db);
  });

  describe('issue', () => {
    it('should store only the hash of the token it hands out', async () => {
      const token = await repo.issue('user-1', DbAuthTokenPurpose.PASSWORD_RESET);

      expect(db.dbAuthToken.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tokenHash: hashAuthToken(token) }) }),
      );
      expect(JSON.stringify(db.dbAuthToken.create.mock.calls[0])).not.toContain(token);
    });

    it('should burn any earlier token of the same purpose, in the same breath', async () => {
      await repo.issue('user-1', DbAuthTokenPurpose.PASSWORD_RESET);

      expect(db.dbAuthToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', purpose: DbAuthTokenPurpose.PASSWORD_RESET, usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(db.$transaction).toHaveBeenCalled();
    });

    it('should give a reset an hour and an invitation a week', async () => {
      await repo.issue('user-1', DbAuthTokenPurpose.PASSWORD_RESET);
      const reset = db.dbAuthToken.create.mock.calls[0][0].data.expiresAt.getTime();

      await repo.issue('user-1', DbAuthTokenPurpose.INVITE);
      const invite = db.dbAuthToken.create.mock.calls[1][0].data.expiresAt.getTime();

      expect(Math.round((reset - Date.now()) / 3_600_000)).toBe(1);
      expect(Math.round((invite - Date.now()) / 3_600_000)).toBe(24 * 7);
    });

    it('should never hand out the same token twice', async () => {
      const first = await repo.issue('user-1', DbAuthTokenPurpose.INVITE);
      const second = await repo.issue('user-1', DbAuthTokenPurpose.INVITE);

      expect(first).not.toBe(second);
    });
  });

  describe('findUsable', () => {
    const stored = (overrides: Record<string, unknown> = {}) => ({
      id: 'token-1',
      userId: 'user-1',
      purpose: DbAuthTokenPurpose.PASSWORD_RESET,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {},
      ...overrides,
    });

    it('should look the token up by its hash, never by the token itself', async () => {
      db.dbAuthToken.findUnique.mockResolvedValue(stored());

      await repo.findUsable('a-token', DbAuthTokenPurpose.PASSWORD_RESET);

      expect(db.dbAuthToken.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tokenHash: hashAuthToken('a-token') } }),
      );
    });

    it('should return a live token', async () => {
      db.dbAuthToken.findUnique.mockResolvedValue(stored());

      await expect(repo.findUsable('a-token', DbAuthTokenPurpose.PASSWORD_RESET)).resolves.toMatchObject({
        id: 'token-1',
      });
    });

    it('should refuse a token minted for something else', async () => {
      db.dbAuthToken.findUnique.mockResolvedValue(stored({ purpose: DbAuthTokenPurpose.INVITE }));

      await expect(repo.findUsable('a-token', DbAuthTokenPurpose.PASSWORD_RESET)).resolves.toBeNull();
    });

    it('should refuse a token that has been spent', async () => {
      db.dbAuthToken.findUnique.mockResolvedValue(stored({ usedAt: new Date() }));

      await expect(repo.findUsable('a-token', DbAuthTokenPurpose.PASSWORD_RESET)).resolves.toBeNull();
    });

    it('should refuse a token past its expiry', async () => {
      db.dbAuthToken.findUnique.mockResolvedValue(stored({ expiresAt: new Date(Date.now() - 1) }));

      await expect(repo.findUsable('a-token', DbAuthTokenPurpose.PASSWORD_RESET)).resolves.toBeNull();
    });

    it('should refuse a token nobody issued', async () => {
      db.dbAuthToken.findUnique.mockResolvedValue(null);

      await expect(repo.findUsable('a-token', DbAuthTokenPurpose.PASSWORD_RESET)).resolves.toBeNull();
    });
  });

  describe('spend', () => {
    it('should let exactly one caller through', async () => {
      db.dbAuthToken.updateMany.mockResolvedValue({ count: 1 });

      await expect(repo.spend('token-1')).resolves.toBe(true);
      expect(db.dbAuthToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'token-1', usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('should turn the second caller away, so a link cannot be redeemed twice at once', async () => {
      db.dbAuthToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(repo.spend('token-1')).resolves.toBe(false);
    });
  });
});
