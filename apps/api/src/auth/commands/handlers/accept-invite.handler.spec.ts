import { ErrorCodes } from '@coaster/common';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyPassword } from '../../domain/password';
import { AcceptInviteCommand } from '../impl/accept-invite.command';
import { AcceptInviteHandler } from './accept-invite.handler';

const ORIGIN = { userAgent: 'a-browser', ip: '10.0.0.1' };

const storedToken = (user: Record<string, unknown> = {}) => ({
  id: 'token-1',
  userId: 'user-1',
  user: { id: 'user-1', active: true, emailVerifiedAt: null, passwordHash: null, ...user },
});

describe('AcceptInviteHandler', () => {
  let users: any;
  let tokens: any;
  let session: any;
  let pwned: any;
  let events: any;
  let handler: AcceptInviteHandler;

  beforeEach(() => {
    vi.clearAllMocks();

    users = { update: vi.fn().mockResolvedValue({ id: 'user-1', preferences: null }) };
    tokens = { findUsable: vi.fn().mockResolvedValue(storedToken()), spend: vi.fn().mockResolvedValue(true) };
    session = { issue: vi.fn().mockResolvedValue({ accessToken: 'fresh' }) };
    pwned = { assertNotCompromised: vi.fn().mockResolvedValue(undefined) };
    events = { publish: vi.fn() };

    handler = new AcceptInviteHandler(users, tokens, session, pwned, events);
  });

  const accept = () => handler.execute(new AcceptInviteCommand('an-invite-token', 'a-good-enough-password', ORIGIN));

  it('should set the password and sign the invited person in', async () => {
    await expect(accept()).resolves.toEqual({ accessToken: 'fresh' });

    await expect(verifyPassword(users.update.mock.calls[0][1].passwordHash, 'a-good-enough-password')).resolves.toBe(
      true,
    );
  });

  it('should treat the invitation as proof of the address, since it arrived in that mailbox', async () => {
    await accept();

    expect(users.update.mock.calls[0][1].emailVerifiedAt).toBeInstanceOf(Date);
  });

  it('should spend the invitation so the link stops working', async () => {
    await accept();

    expect(tokens.spend).toHaveBeenCalledWith('token-1');
  });

  it('should refuse an invitation somebody has already claimed', async () => {
    tokens.spend.mockResolvedValue(false);

    await expect(accept()).rejects.toThrow(BadRequestException);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('should refuse an invitation that expired or never existed', async () => {
    tokens.findUsable.mockResolvedValue(null);

    await expect(accept()).rejects.toThrow(BadRequestException);
  });

  it('should refuse to overwrite a password the account already had', async () => {
    tokens.findUsable.mockResolvedValue(storedToken({ passwordHash: '$argon2id$...' }));

    await expect(accept()).rejects.toThrow(BadRequestException);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('should refuse a deactivated account', async () => {
    tokens.findUsable.mockResolvedValue(storedToken({ active: false }));

    await expect(accept()).rejects.toThrow(UnauthorizedException);
  });

  it('should refuse a password that is already in a breach without spending the invitation on it', async () => {
    pwned.assertNotCompromised.mockRejectedValue(new BadRequestException(ErrorCodes.PASSWORD_COMPROMISED));

    await expect(accept()).rejects.toThrow(BadRequestException);

    expect(tokens.spend).not.toHaveBeenCalled();
    expect(users.update).not.toHaveBeenCalled();
  });

  it('should record the invitation being claimed in the auth log', async () => {
    await accept();

    expect(events.publish.mock.calls[0][0].entry).toMatchObject({ type: 'INVITE_ACCEPTED', userId: 'user-1' });
  });
});
