import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asUserId } from '../../../core';
import { BarMembersWriteRepository } from '../../data-access/bar-members.write.repository';
import { MemberInvitedEvent } from '../../events';
import { CompleteInviteMemberCommand } from '../impl/complete-invite-member.command';
import { CompleteInviteMemberHandler } from './complete-invite-member.handler';

describe('CompleteInviteMemberHandler', () => {
  let handler: CompleteInviteMemberHandler;
  const repository = {
    invite: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompleteInviteMemberHandler,
        { provide: BarMembersWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<CompleteInviteMemberHandler>(CompleteInviteMemberHandler);
  });

  it('should invite and publish MemberInvitedEvent', async () => {
    repository.invite.mockResolvedValue({
      id: 'new-member',
      user: {
        name: 'User',
        email: 'new@test.com',
      },
      bar: {
        name: 'Test Bar',
      },
    });

    await handler.execute(new CompleteInviteMemberCommand(asUserId('user-1'), asBarId('bar-1'), 'STAFF', 'en'));

    expect(repository.invite).toHaveBeenCalledWith('bar-1', 'user-1', { role: 'STAFF' });
    expect(eventBus.publish).toHaveBeenCalledWith(
      new MemberInvitedEvent(asBarId('bar-1'), expect.any(String), 'new@test.com', 'Test Bar', 'User', 'en'),
    );
  });

  it('should fail if the repository fails', async () => {
    repository.invite.mockRejectedValue(new NotFoundException());

    await expect(
      handler.execute(new CompleteInviteMemberCommand(asUserId('user-1'), asBarId('bar-1'), 'STAFF', 'en')),
    ).rejects.toThrow(NotFoundException);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
