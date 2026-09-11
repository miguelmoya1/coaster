import { CacheKeys } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthUserRepository } from './auth-user.repository';

describe('AuthUserRepository', () => {
  let db: any;
  let cache: any;
  let repo: AuthUserRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    db = { dbUser: { update: vi.fn().mockResolvedValue({ id: 'user-1' }), findUnique: vi.fn() } };
    cache = { forget: vi.fn(), remember: vi.fn() };
    repo = new AuthUserRepository(db, cache);
  });

  it('should forget the cached row on every write, or a stale user survives the change', async () => {
    await repo.update('user-1', { emailVerifiedAt: new Date() });

    expect(db.dbUser.update).toHaveBeenCalled();
    expect(cache.forget).toHaveBeenCalledWith(CacheKeys.user('user-1'));
  });

  it('should hand back the row it just wrote, preferences included', async () => {
    await expect(repo.update('user-1', {})).resolves.toEqual({ id: 'user-1' });

    expect(db.dbUser.update.mock.calls[0][0].include).toEqual({ preferences: true });
  });

  it('should look an account up by id with its preferences', async () => {
    await repo.findById('user-1');

    expect(db.dbUser.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' }, include: { preferences: true } });
  });

  it('should look an account up by address trimmed and lowercased', async () => {
    await repo.findByEmail('  Alguien@Coaster.TEST ');

    expect(db.dbUser.findUnique.mock.calls[0][0].where).toEqual({ email: 'alguien@coaster.test' });
  });
});
