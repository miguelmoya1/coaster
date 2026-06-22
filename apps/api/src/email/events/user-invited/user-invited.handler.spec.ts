import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailService } from '../../email.service';
import { UserInvitedEvent } from '../../../events';
import { UserInvitedHandler } from './user-invited.handler';

describe('UserInvitedHandler', () => {
  let handler: UserInvitedHandler;
  const emailService = {
    sendInviteEmail: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserInvitedHandler,
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    handler = module.get<UserInvitedHandler>(UserInvitedHandler);
  });

  it('should send invite email when user is invited', async () => {
    const event = new UserInvitedEvent('John Doe', 'john@example.com', 'My Bar', 'es');

    await handler.handle(event);

    expect(emailService.sendInviteEmail).toHaveBeenCalledWith(
      'john@example.com',
      'My Bar',
      'John Doe',
      'es',
    );
  });
});
