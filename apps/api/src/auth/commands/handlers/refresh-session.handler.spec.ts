import { Logger, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashRefreshToken, REFRESH_REUSE_GRACE_SECONDS } from '../../domain/session';
import { RefreshSessionCommand } from '../impl/refresh-session.command';
import { RefreshSessionHandler } from './refresh-session.handler';

const ORIGIN = { userAgent: 'a-browser', ip: '10.0.0.1' };

const activeUser = { id: 'user-1', active: true, preferences: null };

const sessionRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'session-1',
  userId: 'user-1',
  familyId: 'family-1',
  expiresAt: new Date(Date.now() + 60_000),
  rotatedAt: null,
  revokedAt: null,
  ...overrides,
});

describe('RefreshSessionHandler', () => {
  let db: any;
  let repo: any;
  let sessions: any;
  let handler: RefreshSessionHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'warn').mockReturnValue(undefined);

    db = { dbUser: { findUnique: vi.fn().mockResolvedValue(activeUser) } };
    repo = { findByTokenHash: vi.fn(), revokeFamily: vi.fn() };
    sessions = { rotate: vi.fn().mockResolvedValue({ accessToken: 'fresh' }) };
    handler = new RefreshSessionHandler(db, repo, sessions);
  });

  const refresh = (token?: string) => handler.execute(new RefreshSessionCommand(token, ORIGIN));

  it('should rotate a live session', async () => {
    repo.findByTokenHash.mockResolvedValue(sessionRow());

    await expect(refresh('a-refresh-token')).resolves.toEqual({ accessToken: 'fresh' });

    expect(repo.findByTokenHash).toHaveBeenCalledWith(hashRefreshToken('a-refresh-token'));
    expect(sessions.rotate).toHaveBeenCalledWith('session-1', 'family-1', activeUser, ORIGIN);
  });

  it('should refuse when no cookie arrived', async () => {
    await expect(refresh()).rejects.toThrow(UnauthorizedException);
    expect(repo.findByTokenHash).not.toHaveBeenCalled();
  });

  it('should refuse a token nobody issued', async () => {
    repo.findByTokenHash.mockResolvedValue(null);

    await expect(refresh('a-refresh-token')).rejects.toThrow(UnauthorizedException);
  });

  it('should refuse a session past its expiry', async () => {
    repo.findByTokenHash.mockResolvedValue(sessionRow({ expiresAt: new Date(Date.now() - 1) }));

    await expect(refresh('a-refresh-token')).rejects.toThrow(UnauthorizedException);
    expect(sessions.rotate).not.toHaveBeenCalled();
  });

  it('should drop the whole family when an old token comes back long after rotation', async () => {
    repo.findByTokenHash.mockResolvedValue(
      sessionRow({ rotatedAt: new Date(Date.now() - (REFRESH_REUSE_GRACE_SECONDS + 1) * 1000) }),
    );

    await expect(refresh('a-refresh-token')).rejects.toThrow(UnauthorizedException);

    expect(repo.revokeFamily).toHaveBeenCalledWith('family-1');
    expect(sessions.rotate).not.toHaveBeenCalled();
  });

  it('should let two tabs racing each other through, rather than logging the user out', async () => {
    repo.findByTokenHash.mockResolvedValue(sessionRow({ rotatedAt: new Date(Date.now() - 1000) }));

    await expect(refresh('a-refresh-token')).resolves.toEqual({ accessToken: 'fresh' });

    expect(repo.revokeFamily).not.toHaveBeenCalled();
  });

  it('should refuse the moment the session is revoked, without waiting out the race window', async () => {
    repo.findByTokenHash.mockResolvedValue(sessionRow({ revokedAt: new Date(), rotatedAt: new Date() }));

    await expect(refresh('a-refresh-token')).rejects.toThrow(UnauthorizedException);

    expect(sessions.rotate).not.toHaveBeenCalled();
  });

  it('should drop the family when the account has been deactivated', async () => {
    repo.findByTokenHash.mockResolvedValue(sessionRow());
    db.dbUser.findUnique.mockResolvedValue({ ...activeUser, active: false });

    await expect(refresh('a-refresh-token')).rejects.toThrow(UnauthorizedException);

    expect(repo.revokeFamily).toHaveBeenCalledWith('family-1');
  });

  it('should drop the family when the account is gone', async () => {
    repo.findByTokenHash.mockResolvedValue(sessionRow());
    db.dbUser.findUnique.mockResolvedValue(null);

    await expect(refresh('a-refresh-token')).rejects.toThrow(UnauthorizedException);

    expect(repo.revokeFamily).toHaveBeenCalledWith('family-1');
  });
});
