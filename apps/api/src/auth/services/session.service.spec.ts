import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashRefreshToken, REFRESH_TOKEN_TTL_SECONDS } from '../domain/session';
import { SessionService } from './session.service';

const ORIGIN = { userAgent: 'a-browser', ip: '10.0.0.1' };

const user = {
  id: 'user-1',
  email: 'someone@coaster.test',
  name: 'Someone',
  photoUrl: null,
  active: true,
  role: 'USER',
  preferences: { language: 'es' },
} as any;

describe('SessionService', () => {
  let repo: any;
  let tokens: any;
  let service: SessionService;

  beforeEach(() => {
    vi.clearAllMocks();

    repo = {
      create: vi.fn((data: any) => Promise.resolve({ id: 'session-1', ...data })),
      rotate: vi.fn((_id: string, data: any) => Promise.resolve({ id: 'session-2', ...data })),
      findByTokenHash: vi.fn(),
      revokeFamily: vi.fn(),
      revokeEverySessionOf: vi.fn(),
      pruneExpiredOf: vi.fn(),
    };
    tokens = { sign: vi.fn().mockReturnValue('an-access-token') };
    service = new SessionService(repo, tokens);
  });

  it('should store only the hash of the refresh token it hands out', async () => {
    const issued = await service.issue(user, ORIGIN);

    expect(repo.create.mock.calls[0][0].tokenHash).toBe(hashRefreshToken(issued.refreshToken));
    expect(repo.create.mock.calls[0][0].tokenHash).not.toBe(issued.refreshToken);
  });

  it('should sign the access token against the session it just created', async () => {
    const issued = await service.issue(user, ORIGIN);

    expect(tokens.sign).toHaveBeenCalledWith('user-1', 'session-1');
    expect(issued.accessToken).toBe('an-access-token');
  });

  it('should date the cookie the full window away', async () => {
    const issued = await service.issue(user, ORIGIN);
    const days = (issued.refreshExpiresAt.getTime() - Date.now()) / 1000;

    expect(Math.round(days)).toBe(REFRESH_TOKEN_TTL_SECONDS);
  });

  it('should sweep the expired sessions of whoever signs in', async () => {
    await service.issue(user, ORIGIN);

    expect(repo.pruneExpiredOf).toHaveBeenCalledWith('user-1');
  });

  it('should keep a rotated session inside the family it came from', async () => {
    await service.rotate('session-1', 'family-1', user, ORIGIN);

    expect(repo.rotate.mock.calls[0][1].familyId).toBe('family-1');
  });

  it('should hand out a different refresh token on every rotation', async () => {
    const first = await service.rotate('session-1', 'family-1', user, ORIGIN);
    const second = await service.rotate('session-2', 'family-1', user, ORIGIN);

    expect(first.refreshToken).not.toBe(second.refreshToken);
  });

  it('should drop the whole family when a session is revoked', async () => {
    repo.findByTokenHash.mockResolvedValue({ id: 'session-1', familyId: 'family-1' });

    await service.revoke('a-refresh-token');

    expect(repo.revokeFamily).toHaveBeenCalledWith('family-1');
  });

  it('should do nothing when logging out without a cookie', async () => {
    await service.revoke(undefined);

    expect(repo.findByTokenHash).not.toHaveBeenCalled();
    expect(repo.revokeFamily).not.toHaveBeenCalled();
  });

  it('should shrug off a logout with a token nobody issued', async () => {
    repo.findByTokenHash.mockResolvedValue(null);

    await expect(service.revoke('a-stale-token')).resolves.toBeUndefined();
    expect(repo.revokeFamily).not.toHaveBeenCalled();
  });
});
