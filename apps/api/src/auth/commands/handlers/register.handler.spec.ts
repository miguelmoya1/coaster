import { ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyPassword } from '../../domain/password';
import { RegisterCommand } from '../impl/register.command';
import { RegisterHandler } from './register.handler';

const ORIGIN = { userAgent: 'a-browser', ip: '10.0.0.1' };

describe('RegisterHandler', () => {
  let db: any;
  let sessions: any;
  let config: any;
  let handler: RegisterHandler;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockReturnValue(undefined);

    db = {
      dbUser: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'user-1' }) },
      dbBetaTester: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    sessions = { issue: vi.fn().mockResolvedValue({ accessToken: 'fresh' }) };
    config = { get: vi.fn().mockReturnValue('false') };
    handler = new RegisterHandler(db, sessions, config);
  });

  const register = (email = ' Someone@Coaster.test ', language?: string) =>
    handler.execute(new RegisterCommand(email, 'a-good-enough-password', ' Someone ', language, ORIGIN));

  it('should open an account and sign it in', async () => {
    await expect(register()).resolves.toEqual({ accessToken: 'fresh' });

    expect(sessions.issue).toHaveBeenCalledWith({ id: 'user-1' }, ORIGIN);
  });

  it('should store the address lowercased and the name trimmed', async () => {
    await register();

    expect(db.dbUser.create.mock.calls[0][0].data).toMatchObject({ email: 'someone@coaster.test', name: 'Someone' });
  });

  it('should store the password hashed, never as given', async () => {
    await register();

    const { passwordHash } = db.dbUser.create.mock.calls[0][0].data;

    expect(passwordHash).not.toContain('a-good-enough-password');
    await expect(verifyPassword(passwordHash, 'a-good-enough-password')).resolves.toBe(true);
  });

  it('should leave the address unverified until somebody proves it', async () => {
    await register();

    expect(db.dbUser.create.mock.calls[0][0].data.emailVerifiedAt).toBeUndefined();
  });

  it('should carry the language through when the form sent one', async () => {
    await register(' Someone@Coaster.test ', 'ca');

    expect(db.dbUser.create.mock.calls[0][0].data.preferences).toEqual({ create: { language: 'ca' } });
  });

  it('should refuse an address that already has an account', async () => {
    db.dbUser.findUnique.mockResolvedValue({ id: 'someone-else' });

    await expect(register()).rejects.toThrow(ConflictException);
    expect(db.dbUser.create).not.toHaveBeenCalled();
  });

  it('should refuse anyone off the allowlist while the beta is closed', async () => {
    config.get.mockReturnValue('true');

    await expect(register()).rejects.toThrow(ForbiddenException);
    expect(db.dbUser.create).not.toHaveBeenCalled();
  });

  it('should let an invited tester through while the beta is closed', async () => {
    config.get.mockReturnValue('true');
    db.dbBetaTester.findUnique.mockResolvedValue({ email: 'someone@coaster.test' });

    await expect(register()).resolves.toEqual({ accessToken: 'fresh' });
    expect(db.dbBetaTester.findUnique).toHaveBeenCalledWith({ where: { email: 'someone@coaster.test' } });
  });
});
