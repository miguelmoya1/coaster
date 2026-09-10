import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword } from '../../domain/password';
import { LoginWithPasswordCommand } from '../impl/login-with-password.command';
import { LoginWithPasswordHandler } from './login-with-password.handler';

const ORIGIN = { userAgent: 'a-browser', ip: '10.0.0.1' };

describe('LoginWithPasswordHandler', () => {
  let db: any;
  let sessions: any;
  let handler: LoginWithPasswordHandler;
  let passwordHash: string;

  beforeEach(async () => {
    passwordHash = await hashPassword('the-right-password');
    db = { dbUser: { findUnique: vi.fn() } };
    sessions = { issue: vi.fn().mockResolvedValue({ accessToken: 'fresh' }) };
    handler = new LoginWithPasswordHandler(db, sessions);
  });

  const login = (email = 'Someone@Coaster.test ', password = 'the-right-password') =>
    handler.execute(new LoginWithPasswordCommand(email, password, ORIGIN));

  it('should sign in a user whose password matches', async () => {
    const user = { id: 'user-1', active: true, passwordHash, preferences: null };
    db.dbUser.findUnique.mockResolvedValue(user);

    await expect(login()).resolves.toEqual({ accessToken: 'fresh' });

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
});
