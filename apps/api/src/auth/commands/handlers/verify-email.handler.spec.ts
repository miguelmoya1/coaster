import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestEmailVerificationCommand } from '../impl/request-email-verification.command';
import { VerifyEmailCommand } from '../impl/verify-email.command';
import { RequestEmailVerificationHandler } from './request-email-verification.handler';
import { VerifyEmailHandler } from './verify-email.handler';

describe('RequestEmailVerificationHandler', () => {
  let users: any;
  let tokens: any;
  let email: any;
  let handler: RequestEmailVerificationHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);

    users = {
      findById: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@coaster.test',
        name: 'A',
        emailVerifiedAt: null,
        preferences: { language: 'ca' },
      }),
    };
    tokens = { issue: vi.fn().mockResolvedValue('a-verification-token') };
    email = { sendEmailVerification: vi.fn().mockResolvedValue(undefined) };

    handler = new RequestEmailVerificationHandler(users, tokens, email);
  });

  const request = () => handler.execute(new RequestEmailVerificationCommand('user-1'));

  it('should send the link in the language the person reads', async () => {
    await request();

    expect(tokens.issue).toHaveBeenCalledWith('user-1', 'EMAIL_VERIFICATION');
    expect(email.sendEmailVerification).toHaveBeenCalledWith('a@coaster.test', 'A', 'a-verification-token', 'ca');
  });

  it('should send nothing to somebody who already confirmed', async () => {
    users.findById.mockResolvedValue({ id: 'user-1', emailVerifiedAt: new Date() });

    await expect(request()).resolves.toBeUndefined();
    expect(tokens.issue).not.toHaveBeenCalled();
  });

  it('should refuse for an account that does not exist', async () => {
    users.findById.mockResolvedValue(null);

    await expect(request()).rejects.toThrow(NotFoundException);
  });
});

describe('VerifyEmailHandler', () => {
  let users: any;
  let tokens: any;
  let handler: VerifyEmailHandler;

  beforeEach(() => {
    vi.clearAllMocks();

    users = { update: vi.fn() };
    tokens = {
      findUsable: vi.fn().mockResolvedValue({ id: 'token-1', userId: 'user-1', user: { emailVerifiedAt: null } }),
      spend: vi.fn().mockResolvedValue(true),
    };

    handler = new VerifyEmailHandler(users, tokens);
  });

  const verify = () => handler.execute(new VerifyEmailCommand('a-verification-token'));

  it('should mark the address confirmed', async () => {
    await verify();

    expect(users.update).toHaveBeenCalledWith('user-1', { emailVerifiedAt: expect.any(Date) });
  });

  it('should keep the original date when the address was already confirmed', async () => {
    const already = new Date('2026-01-01');
    tokens.findUsable.mockResolvedValue({ id: 'token-1', userId: 'user-1', user: { emailVerifiedAt: already } });

    await verify();

    expect(users.update).toHaveBeenCalledWith('user-1', { emailVerifiedAt: already });
  });

  it('should refuse a link that expired or never existed', async () => {
    tokens.findUsable.mockResolvedValue(null);

    await expect(verify()).rejects.toThrow(BadRequestException);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('should refuse a link somebody has already used', async () => {
    tokens.spend.mockResolvedValue(false);

    await expect(verify()).rejects.toThrow(BadRequestException);
    expect(users.update).not.toHaveBeenCalled();
  });
});
