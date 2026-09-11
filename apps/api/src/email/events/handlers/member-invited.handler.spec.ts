import { AuthTokenRepository } from '@coaster/auth';
import { asEstablishmentId, asEstablishmentMemberId, asUserId } from '@coaster/common';
import { MemberInvitedEvent } from '@coaster/establishment-members';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailService } from '../../email.service';
import { MemberInvitedHandler } from './member-invited.handler';

describe('MemberInvitedHandler', () => {
  let handler: MemberInvitedHandler;

  const emailService = { sendInvite: vi.fn() };
  const tokens = { issue: vi.fn() };

  const event = new MemberInvitedEvent(
    asEstablishmentId('establishment-1'),
    asEstablishmentMemberId('mem-1'),
    'john@example.com',
    'My Establishment',
    'John Doe',
    'es',
    asUserId('user-1'),
  );

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);
    vi.spyOn(Logger.prototype, 'error').mockReturnValue(undefined);

    tokens.issue.mockResolvedValue('an-invite-token');
    emailService.sendInvite.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberInvitedHandler,
        { provide: EmailService, useValue: emailService },
        { provide: AuthTokenRepository, useValue: tokens },
      ],
    }).compile();

    handler = module.get<MemberInvitedHandler>(MemberInvitedHandler);
  });

  it('should mint an invitation token and send it', async () => {
    await handler.handle(event);

    expect(tokens.issue).toHaveBeenCalledWith('user-1', 'INVITE');
    expect(emailService.sendInvite).toHaveBeenCalledWith(
      'john@example.com',
      { establishmentName: 'My Establishment', inviterName: 'John Doe', token: 'an-invite-token' },
      'es',
    );
  });

  it('should not take the whole invitation down when the email cannot be sent', async () => {
    emailService.sendInvite.mockRejectedValue(new Error('domain is not verified'));

    await expect(handler.handle(event)).resolves.toBeUndefined();
  });

  it('should say loudly that the invitation never left', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockReturnValue(undefined);
    emailService.sendInvite.mockRejectedValue(new Error('domain is not verified'));

    await handler.handle(event);

    expect(error).toHaveBeenCalledWith(expect.stringContaining('never left'));
  });
});
