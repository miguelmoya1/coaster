import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from './auth.guard';
import { OptionalAuthGuard } from './optional-auth.guard';

const userRow = {
  id: 'user-1',
  email: 'someone@coaster.test',
  name: 'Someone',
  photoUrl: null,
  active: true,
  role: 'USER',
  preferences: { language: 'es' },
};

const contextFor = (request: Record<string, unknown>) =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;

describe('AuthGuard', () => {
  let tokens: any;
  let guard: AuthGuard;

  beforeEach(() => {
    tokens = { resolve: vi.fn() };
    guard = new AuthGuard(tokens);
  });

  it('should let an active user through and hand the handler the domain user', async () => {
    tokens.resolve.mockResolvedValue({ claims: { sub: 'user-1' }, user: userRow });
    const request: Record<string, unknown> = { headers: { authorization: 'Bearer a-token' } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);

    expect(tokens.resolve).toHaveBeenCalledWith('Bearer a-token');
    expect(request.user).toMatchObject({ id: 'user-1', email: 'someone@coaster.test', language: 'es' });
  });

  it('should refuse a request with no token', async () => {
    tokens.resolve.mockResolvedValue(null);

    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toThrow(UnauthorizedException);
  });

  it('should refuse a token whose user no longer exists', async () => {
    tokens.resolve.mockResolvedValue({ claims: { sub: 'user-1' }, user: null });

    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toThrow(UnauthorizedException);
  });

  it('should refuse a deactivated user', async () => {
    tokens.resolve.mockResolvedValue({ claims: { sub: 'user-1' }, user: { ...userRow, active: false } });

    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toThrow(UnauthorizedException);
  });
});

describe('OptionalAuthGuard', () => {
  let tokens: any;
  let guard: OptionalAuthGuard;

  beforeEach(() => {
    tokens = { resolve: vi.fn() };
    guard = new OptionalAuthGuard(tokens);
  });

  it('should attach the user when there is one', async () => {
    tokens.resolve.mockResolvedValue({ claims: { sub: 'user-1' }, user: userRow });
    const request: Record<string, unknown> = { headers: { authorization: 'Bearer a-token' } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toMatchObject({ id: 'user-1' });
  });

  it('should let a stranger through with no user attached', async () => {
    tokens.resolve.mockResolvedValue(null);
    const request: Record<string, unknown> = { headers: {} };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toBeNull();
  });

  it('should not attach a deactivated user', async () => {
    tokens.resolve.mockResolvedValue({ claims: { sub: 'user-1' }, user: { ...userRow, active: false } });
    const request: Record<string, unknown> = { headers: {} };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toBeNull();
  });
});
