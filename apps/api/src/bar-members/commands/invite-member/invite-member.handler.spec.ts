import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@nestjs/cqrs';
import { asBarId, asUserId } from '../../../core';
import { UserInvitedEvent } from '../../../events';
import { BarMembersWriteRepository } from '../../data-access/bar-members.write.repository';
import { InviteMemberCommand } from './invite-member.command';
import { InviteMemberHandler } from './invite-member.handler';

describe('InviteMemberHandler', () => {
  let handler: InviteMemberHandler;
  const repository = {
    inviteMember: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteMemberHandler,
        { provide: BarMembersWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<InviteMemberHandler>(InviteMemberHandler);
  });

  it('should invite and publish UserInvitedEvent', async () => {
    repository.inviteMember.mockResolvedValue({
      id: 'new-member',
      user: {
        name: 'User',
        email: 'new@test.com',
      },
      bar: {
        name: 'Test Bar',
      },
    });

    await handler.execute(new InviteMemberCommand(asUserId('new@test.com'), asBarId('bar-1'), 'STAFF'));

    expect(repository.inviteMember).toHaveBeenCalledWith('bar-1', 'new@test.com', { role: 'STAFF' });
    expect(eventBus.publish).toHaveBeenCalledWith(new UserInvitedEvent('User', 'new@test.com', 'Test Bar'));
  });

  it('should fail if the repository fails', async () => {
    repository.inviteMember.mockRejectedValue(new NotFoundException());

    await expect(
      handler.execute(new InviteMemberCommand(asUserId('new@test.com'), asBarId('bar-1'), 'STAFF')),
    ).rejects.toThrow(NotFoundException);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
