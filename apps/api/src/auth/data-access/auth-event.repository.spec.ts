import { DbAuthEventType } from '@coaster/core/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthEventRepository } from './auth-event.repository';

describe('AuthEventRepository', () => {
  let db: any;
  let repo: AuthEventRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    db = { dbAuthEvent: { create: vi.fn().mockResolvedValue({ id: 'event-1' }), findMany: vi.fn() } };
    repo = new AuthEventRepository(db);
  });

  const written = () => db.dbAuthEvent.create.mock.calls[0][0].data;

  it('should store the address the same way the accounts table does', async () => {
    await repo.record({ type: DbAuthEventType.LOGIN_FAILED, email: '  SomeOne@Coaster.TEST ' });

    expect(written().email).toBe('someone@coaster.test');
  });

  it('should leave the columns empty rather than guess, for an attempt on an address nobody has', async () => {
    await repo.record({ type: DbAuthEventType.LOGIN_FAILED, email: 'nobody@coaster.test' });

    expect(written()).toMatchObject({ userId: null, sessionId: null, ip: null, userAgent: null });
  });

  it('should keep a browser that talks too much from filling the table', async () => {
    await repo.record({ type: DbAuthEventType.LOGIN_SUCCEEDED, userId: 'user-1', userAgent: 'x'.repeat(4000) });

    expect(written().userAgent).toHaveLength(512);
  });

  it('should read an account history newest first', async () => {
    await repo.findRecentOf('user-1', 20);

    expect(db.dbAuthEvent.findMany.mock.calls[0][0]).toMatchObject({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  });
});
