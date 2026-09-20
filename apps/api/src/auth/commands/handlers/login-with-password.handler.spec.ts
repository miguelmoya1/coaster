import { ErrorCodes } from '@coaster/common';
import { HttpException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword } from '../../domain/password';
import { LoginWithPasswordCommand } from '../impl/login-with-password.command';
import { LoginWithPasswordHandler } from './login-with-password.handler';

const ORIGIN = { userAgent: 'a-browser', ip: '10.0.0.1' };

describe('LoginWithPasswordHandler', () => {
  let db: any;
  let sessions: any;
  let attempts: any;
  let events: any;
  let handler: LoginWithPasswordHandler;
  let passwordHash: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    passwordHash = await hashPassword('the-right-password');
    db = { dbUser: { findUnique: vi.fn() } };
    sessions = { issue: vi.fn().mockResolvedValue({ accessToken: 'fresh', sessionId: 'session-1' }) };
    attempts = { lockedFor: vi.fn().mockResolvedValue(0), remember: vi.fn(), forget: vi.fn() };
    events = { publish: vi.fn() };
    handler = new LoginWithPasswordHandler(db, sessions, attempts, events);
  });

  const publishedTypes = () => events.publish.mock.calls.map(([event]: any) => event.entry.type);

  const login = (email = 'Someone@Coaster.test ', password = 'the-right-password') =>
    handler.execute(new LoginWithPasswordCommand(email, password, ORIGIN));

  it('should sign in a user whose password matches', async () => {
    const user = { id: 'user-1', active: true, passwordHash, preferences: null };
    db.dbUser.findUnique.mockResolvedValue(user);

    await expect(login()).resolves.toEqual({ accessToken: 'fresh', sessionId: 'session-1' });

    expect(sessions.issue).toHaveBeenCalledWith(user, ORIGIN);
  });

  it('should look the address up trimmed and lowercased', async () => {
    db.dbUser.findUnique.mockResolvedValue({ id: 'user-1', active: true, passwordHash, preferences: null });

    await login();

    expect(db.dbUser.findUnique).toHaveBeenCalledWith({
      where: { email: 'someone@coaster.test' },
      include: { preferences: true },
    });
  });

  it('should refuse a wrong password', async () => {
    db.dbUser.findUnique.mockResolvedValue({ id: 'user-1', active: true, passwordHash, preferences: null });

    await expect(login('someone@coaster.test', 'the-wrong-password')).rejects.toThrow(UnauthorizedException);
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('should refuse an address nobody registered, without saying so', async () => {
    db.dbUser.findUnique.mockResolvedValue(null);

    await expect(login()).rejects.toThrow(UnauthorizedException);
  });

  it('should refuse an account that only has a linked provider, without saying so', async () => {
    db.dbUser.findUnique.mockResolvedValue({ id: 'user-1', active: true, passwordHash: null, preferences: null });

    await expect(login()).rejects.toThrow(UnauthorizedException);
  });

  it('should refuse a deactivated account even with the right password', async () => {
    db.dbUser.findUnique.mockResolvedValue({ id: 'user-1', active: false, passwordHash, preferences: null });

    await expect(login()).rejects.toThrow(UnauthorizedException);
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  describe('a run of failures against the same address', () => {
    it('should count a wrong password against the address, not only against the caller', async () => {
      db.dbUser.findUnique.mockResolvedValue({ id: 'user-1', active: true, passwordHash, preferences: null });

      await expect(login('someone@coaster.test', 'the-wrong-password')).rejects.toThrow(UnauthorizedException);

      expect(attempts.remember).toHaveBeenCalledWith('someone@coaster.test');
    });

    it('should count an address nobody registered too, so probing is as expensive', async () => {
      db.dbUser.findUnique.mockResolvedValue(null);

      await expect(login()).rejects.toThrow(UnauthorizedException);

      expect(attempts.remember).toHaveBeenCalledWith('someone@coaster.test');
    });

    it('should turn the address away once it is locked, without even looking it up', async () => {
      attempts.lockedFor.mockResolvedValue(300);

      await expect(login()).rejects.toThrow(HttpException);
      await expect(login()).rejects.toMatchObject({ status: 429, message: ErrorCodes.TOO_MANY_ATTEMPTS });

      expect(db.dbUser.findUnique).not.toHaveBeenCalled();
      expect(attempts.remember).not.toHaveBeenCalled();
    });

    it('should forget the run as soon as somebody gets in', async () => {
      db.dbUser.findUnique.mockResolvedValue({ id: 'user-1', active: true, passwordHash, preferences: null });

      await login();

      expect(attempts.forget).toHaveBeenCalledWith('someone@coaster.test');
    });
  });

  describe('what ends up in the log', () => {
    it('should record the sign-in with the session it opened', async () => {
      db.dbUser.findUnique.mockResolvedValue({ id: 'user-1', active: true, passwordHash, preferences: null });

      await login();

      expect(events.publish).toHaveBeenCalledTimes(1);
      expect(events.publish.mock.calls[0][0].entry).toMatchObject({
        type: 'LOGIN_SUCCEEDED',
        userId: 'user-1',
        email: 'someone@coaster.test',
        sessionId: 'session-1',
        ip: ORIGIN.ip,
      });
    });

    it('should record why an attempt failed, which is what the caller is never told', async () => {
      db.dbUser.findUnique.mockResolvedValue({ id: 'user-1', active: true, passwordHash, preferences: null });

      await expect(login('someone@coaster.test', 'the-wrong-password')).rejects.toThrow(UnauthorizedException);

      expect(publishedTypes()).toEqual(['LOGIN_FAILED']);
      expect(events.publish.mock.calls[0][0].entry.metadata).toEqual({ reason: 'wrong_password' });
    });

    it('should tell an address nobody has from a deactivated account', async () => {
      db.dbUser.findUnique.mockResolvedValue(null);
      await expect(login()).rejects.toThrow(UnauthorizedException);

      db.dbUser.findUnique.mockResolvedValue({ id: 'user-1', active: false, passwordHash, preferences: null });
      await expect(login()).rejects.toThrow(UnauthorizedException);

      expect(events.publish.mock.calls.map(([event]: any) => event.entry.metadata.reason)).toEqual([
        'no_account',
        'inactive',
      ]);
    });

    it('should record an attempt that was turned away for being locked', async () => {
      attempts.lockedFor.mockResolvedValue(300);

      await expect(login()).rejects.toThrow(HttpException);

      expect(publishedTypes()).toEqual(['LOGIN_BLOCKED']);
      expect(events.publish.mock.calls[0][0].entry.metadata).toEqual({ retryAfterSeconds: 300 });
    });
  });
});
