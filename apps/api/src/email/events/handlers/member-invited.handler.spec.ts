import { MemberInvitedEvent } from '@bar-members/events';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asBarMemberId } from '../../../core';
import { EmailService } from '../../email.service';
import { MemberInvitedHandler } from './member-invited.handler';

describe('MemberInvitedHandler', () => {
  let handler: MemberInvitedHandler;
  const emailService = {
    sendInviteEmail: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemberInvitedHandler, { provide: EmailService, useValue: emailService }],
    }).compile();

    handler = module.get<MemberInvitedHandler>(MemberInvitedHandler);
  });

  it('should send invite email when member is invited', async () => {
    const event = new MemberInvitedEvent(
      asBarId('bar-1'),
      asBarMemberId('mem-1'),
      'john@example.com',
      'My Bar',
      'John Doe',
      'es',
    );

    await handler.handle(event);

    expect(emailService.sendInviteEmail).toHaveBeenCalledWith('john@example.com', 'My Bar', 'John Doe', 'es');
  });
});
