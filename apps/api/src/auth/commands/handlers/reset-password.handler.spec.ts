import { BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyPassword } from '../../domain/password';
import { ResetPasswordCommand } from '../impl/reset-password.command';
import { ResetPasswordHandler } from './reset-password.handler';

const ORIGIN = { userAgent: 'a-browser', ip: '10.0.0.1' };

const storedToken = (user: Record<string, unknown> = {}) => ({
  id: 'token-1',
  userId: 'user-1',
  user: { id: 'user-1', active: true, emailVerifiedAt: new Date('2026-01-01'), ...user },
});

describe('ResetPasswordHandler', () => {
  let users: any;
  let tokens: any;
  let sessions: any;
  let session: any;
  let email: any;
  let handler: ResetPasswordHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'error').mockReturnValue(undefined);

    users = {
      update: vi.fn().mockResolvedValue({ id: 'user-1', email: 'a@coaster.test', name: 'A', preferences: null }),
    };
    tokens = { findUsable: vi.fn().mockResolvedValue(storedToken()), spend: vi.fn().mockResolvedValue(true) };
    sessions = { revokeEverySessionOf: vi.fn() };
    session = { issue: vi.fn().mockResolvedValue({ accessToken: 'fresh' }) };
    email = { sendPasswordChanged: vi.fn().mockResolvedValue(undefined) };

    handler = new ResetPasswordHandler(users, tokens, sessions, session, email);
  });

  const reset = (password = 'a-good-enough-password') =>
    handler.execute(new ResetPasswordCommand('a-reset-token', password, ORIGIN));

  it('should store the new password hashed and sign the person in', async () => {
    await expect(reset()).resolves.toEqual({ accessToken: 'fresh' });

    const { passwordHash } = users.update.mock.calls[0][1];

    expect(passwordHash).not.toContain('a-good-enough-password');
    await expect(verifyPassword(passwordHash, 'a-good-enough-password')).resolves.toBe(true);
  });

  it('should close every session, because the old password may be in the wrong hands', async () => {
    await reset();

    expect(sessions.revokeEverySessionOf).toHaveBeenCalledWith('user-1');
  });

  it('should spend the link so it cannot be used twice', async () => {
    await reset();

    expect(tokens.spend).toHaveBeenCalledWith('token-1');
  });

  it('should refuse a link somebody else has already redeemed', async () => {
    tokens.spend.mockResolvedValue(false);

    await expect(reset()).rejects.toThrow(BadRequestException);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('should refuse a link that has expired or never existed', async () => {
    tokens.findUsable.mockResolvedValue(null);

    await expect(reset()).rejects.toThrow(BadRequestException);
  });

  it('should refuse a deactivated account', async () => {
    tokens.findUsable.mockResolvedValue(storedToken({ active: false }));

    await expect(reset()).rejects.toThrow(UnauthorizedException);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('should treat the link as proof of the address when nobody had proved it', async () => {
    tokens.findUsable.mockResolvedValue(storedToken({ emailVerifiedAt: null }));

    await reset();

    expect(users.update.mock.calls[0][1].emailVerifiedAt).toBeInstanceOf(Date);
  });

  it('should warn the owner that the password changed', async () => {
    await reset();

    expect(email.sendPasswordChanged).toHaveBeenCalledWith('a@coaster.test', 'A', undefined);
  });

  it('should still change the password when the warning cannot be sent', async () => {
    email.sendPasswordChanged.mockRejectedValue(new Error('domain is not verified'));

    await expect(reset()).resolves.toEqual({ accessToken: 'fresh' });
  });
});
