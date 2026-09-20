import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetAccountSessionsQuery } from '../impl/get-account-sessions.query';
import { GetAccountSessionsHandler } from './get-account-sessions.handler';

const at = (iso: string) => new Date(iso);

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'session-1',
  userId: 'user-1',
  familyId: 'family-1',
  userAgent: 'Mozilla/5.0 (Macintosh)',
  ip: '10.0.0.1',
  createdAt: at('2026-09-20T10:00:00.000Z'),
  lastUsedAt: at('2026-09-20T10:00:00.000Z'),
  expiresAt: at('2026-10-20T10:00:00.000Z'),
  rotatedAt: null,
  revokedAt: null,
  ...overrides,
});

describe('GetAccountSessionsHandler', () => {
  let sessions: any;
  let handler: GetAccountSessionsHandler;

  beforeEach(() => {
    vi.clearAllMocks();

    sessions = { findLiveOf: vi.fn() };
    handler = new GetAccountSessionsHandler(sessions);
  });

  const ask = (currentSessionId: string | null = null) =>
    handler.execute(new GetAccountSessionsQuery('user-1', currentSessionId));

  it('should show one entry per device, not one per refresh', async () => {
    sessions.findLiveOf.mockResolvedValue([
      row({
        id: 'newest',
        lastUsedAt: at('2026-09-20T12:00:00.000Z'),
        createdAt: at('2026-09-20T12:00:00.000Z'),
      }),
      row({
        id: 'rotated',
        rotatedAt: at('2026-09-20T12:00:00.000Z'),
        lastUsedAt: at('2026-09-20T12:00:00.000Z'),
        createdAt: at('2026-09-20T10:00:00.000Z'),
      }),
    ]);

    const [session, ...rest] = await ask();

    expect(rest).toHaveLength(0);
    expect(session.id).toBe('newest');
    expect(session.createdAt).toEqual(at('2026-09-20T10:00:00.000Z'));
    expect(session.lastUsedAt).toEqual(at('2026-09-20T12:00:00.000Z'));
  });

  it('should flag the device asking, even when its token predates the last refresh', async () => {
    sessions.findLiveOf.mockResolvedValue([
      row({ id: 'this-device-now', lastUsedAt: at('2026-09-20T12:00:00.000Z') }),
      row({ id: 'this-device-before', rotatedAt: at('2026-09-20T12:00:00.000Z') }),
      row({ id: 'the-tablet', familyId: 'family-2', lastUsedAt: at('2026-09-19T12:00:00.000Z') }),
    ]);

    const found = await ask('this-device-before');

    expect(found.find((session) => session.id === 'this-device-now')?.current).toBe(true);
    expect(found.find((session) => session.id === 'the-tablet')?.current).toBe(false);
  });

  it('should put the most recently used device first', async () => {
    sessions.findLiveOf.mockResolvedValue([
      row({ id: 'old', familyId: 'family-1', lastUsedAt: at('2026-09-18T10:00:00.000Z') }),
      row({ id: 'recent', familyId: 'family-2', lastUsedAt: at('2026-09-20T10:00:00.000Z') }),
    ]);

    expect((await ask()).map((session) => session.id)).toEqual(['recent', 'old']);
  });

  it('should fall back to what the family knew when the newest row has no origin', async () => {
    sessions.findLiveOf.mockResolvedValue([
      row({ id: 'newest', userAgent: null, ip: null }),
      row({ id: 'first', rotatedAt: at('2026-09-20T11:00:00.000Z'), userAgent: 'Firefox', ip: '10.0.0.9' }),
    ]);

    const [session] = await ask();

    expect(session).toMatchObject({ id: 'newest', userAgent: 'Firefox', ip: '10.0.0.9' });
  });

  it('should answer with nothing when every session is gone', async () => {
    sessions.findLiveOf.mockResolvedValue([]);

    await expect(ask('whatever')).resolves.toEqual([]);
  });
});
