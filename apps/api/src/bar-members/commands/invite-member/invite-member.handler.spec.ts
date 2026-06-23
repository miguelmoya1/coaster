import { ConflictException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asRole, asUserId } from '../../../core';
import { BarMembersReadRepository } from '../../data-access/bar-members.read.repository';
import { InviteMemberRequestedEvent } from '../../events';
import { InviteMemberCommand } from './invite-member.command';
import { InviteMemberHandler } from './invite-member.handler';

describe('InviteMemberHandler', () => {
  let handler: InviteMemberHandler;
  const repository = {
    isMember: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteMemberHandler,
        { provide: BarMembersReadRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<InviteMemberHandler>(InviteMemberHandler);
  });

  const fakeUser = {
    id: asUserId('admin-id'),
    name: 'Admin Name',
    email: 'admin@test.com',
    active: true,
    role: asRole('USER'),
    language: 'en',
  };

  it('should publish InviteMemberRequestedEvent when member is not registered', async () => {
    repository.isMember.mockResolvedValue(false);

    await handler.execute(new InviteMemberCommand(asBarId('bar-1'), 'new@test.com', fakeUser, 'STAFF'));

    expect(repository.isMember).toHaveBeenCalledWith(asBarId('bar-1'), 'new@test.com');
    expect(eventBus.publish).toHaveBeenCalledWith(
      new InviteMemberRequestedEvent(asBarId('bar-1'), 'new@test.com', 'STAFF', 'en'),
    );
  });

  it('should throw ConflictException if the user is already a member', async () => {
    repository.isMember.mockResolvedValue(true);

    await expect(
      handler.execute(new InviteMemberCommand(asBarId('bar-1'), 'new@test.com', fakeUser, 'STAFF')),
    ).rejects.toThrow(ConflictException);

    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
