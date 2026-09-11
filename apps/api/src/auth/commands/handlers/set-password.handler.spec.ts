import { BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword, verifyPassword } from '../../domain/password';
import { SetPasswordCommand } from '../impl/set-password.command';
import { SetPasswordHandler } from './set-password.handler';

describe('SetPasswordHandler', () => {
  let users: any;
  let sessions: any;
  let email: any;
  let handler: SetPasswordHandler;
  let existingHash: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'error').mockReturnValue(undefined);

    existingHash = await hashPassword('the-old-password');

    users = {
      findById: vi.fn().mockResolvedValue({ id: 'user-1', passwordHash: null }),
      update: vi.fn().mockResolvedValue({ id: 'user-1', email: 'a@coaster.test', name: 'A', preferences: null }),
    };
    sessions = { revokeEveryOtherSessionOf: vi.fn() };
    email = { sendPasswordChanged: vi.fn().mockResolvedValue(undefined) };

    handler = new SetPasswordHandler(users, sessions, email);
  });

  const setPassword = (password = 'a-good-enough-password', currentPassword?: string) =>
    handler.execute(new SetPasswordCommand('user-1', 'session-1', password, currentPassword));

  describe('an account with no password yet', () => {
    it('should let somebody who signed in with Google add one, without asking for a current one', async () => {
      await expect(setPassword()).resolves.toBeUndefined();

      await expect(verifyPassword(users.update.mock.calls[0][1].passwordHash, 'a-good-enough-password')).resolves.toBe(
        true,
      );
    });
  });

  describe('an account that already has one', () => {
    beforeEach(() => {
      users.findById.mockResolvedValue({ id: 'user-1', passwordHash: existingHash });
    });

    it('should change it when the current one matches', async () => {
      await expect(setPassword('a-brand-new-password', 'the-old-password')).resolves.toBeUndefined();

      expect(users.update).toHaveBeenCalled();
    });

    it('should refuse without the current one', async () => {
      await expect(setPassword('a-brand-new-password')).rejects.toThrow(BadRequestException);
      expect(users.update).not.toHaveBeenCalled();
    });

    it('should refuse when the current one is wrong', async () => {
      await expect(setPassword('a-brand-new-password', 'not-the-old-password')).rejects.toThrow(UnauthorizedException);
      expect(users.update).not.toHaveBeenCalled();
    });
  });

  it('should close every other session but leave the one doing the changing alone', async () => {
    await setPassword();

    expect(sessions.revokeEveryOtherSessionOf).toHaveBeenCalledWith('user-1', 'session-1');
  });

  it('should warn the owner', async () => {
    await setPassword();

    expect(email.sendPasswordChanged).toHaveBeenCalledWith('a@coaster.test', 'A', undefined);
  });

  it('should still change the password when the warning cannot be sent', async () => {
    email.sendPasswordChanged.mockRejectedValue(new Error('domain is not verified'));

    await expect(setPassword()).resolves.toBeUndefined();
  });
});
