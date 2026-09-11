import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestPasswordResetCommand } from '../impl/request-password-reset.command';
import { RequestPasswordResetHandler } from './request-password-reset.handler';

describe('RequestPasswordResetHandler', () => {
  let users: any;
  let tokens: any;
  let email: any;
  let handler: RequestPasswordResetHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);

    users = {
      findByEmail: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@coaster.test',
        name: 'A',
        active: true,
        preferences: null,
      }),
    };
    tokens = { issue: vi.fn().mockResolvedValue('a-reset-token') };
    email = { sendPasswordReset: vi.fn().mockResolvedValue(undefined) };

    handler = new RequestPasswordResetHandler(users, tokens, email);
  });

  const request = (address = 'a@coaster.test') => handler.execute(new RequestPasswordResetCommand(address));

  it('should email a link to somebody who has an account', async () => {
    await request();

    expect(tokens.issue).toHaveBeenCalledWith('user-1', 'PASSWORD_RESET');
    expect(email.sendPasswordReset).toHaveBeenCalledWith('a@coaster.test', 'A', 'a-reset-token', undefined);
  });

  it('should also work for somebody who only ever signed in with Google, which is how they get a password', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'a@coaster.test',
      name: 'A',
      active: true,
      passwordHash: null,
      preferences: null,
    });

    await request();

    expect(email.sendPasswordReset).toHaveBeenCalled();
  });

  it('should say nothing at all about an address nobody registered', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(request('nobody@coaster.test')).resolves.toBeUndefined();
    expect(tokens.issue).not.toHaveBeenCalled();
    expect(email.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('should send nothing to a deactivated account, and still answer the same', async () => {
    users.findByEmail.mockResolvedValue({ id: 'user-1', active: false });

    await expect(request()).resolves.toBeUndefined();
    expect(email.sendPasswordReset).not.toHaveBeenCalled();
  });
});
