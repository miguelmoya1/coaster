import { ConflictException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { PrepareUserForInviteEvent } from '@users/events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asRole, asUserId } from '../../../core';

import { BarMembersReadRepository } from '../../data-access/bar-members.read.repository';
import { PrepareInviteMemberCommand } from './prepare-invite-member.command';
import { PrepareInviteMemberHandler } from './prepare-invite-member.handler';

describe('PrepareInviteMemberHandler', () => {
  let handler: PrepareInviteMemberHandler;
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
        PrepareInviteMemberHandler,
        { provide: BarMembersReadRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<PrepareInviteMemberHandler>(PrepareInviteMemberHandler);
  });

  const fakeUser = {
    id: asUserId('admin-id'),
    name: 'Admin Name',
    email: 'admin@test.com',
    active: true,
    role: asRole('USER'),
    language: 'en',
  };

  it('should publish PrepareUserForInviteEvent when member is not registered', async () => {
    repository.isMember.mockResolvedValue(false);

    await handler.execute(new PrepareInviteMemberCommand(asBarId('bar-1'), 'new@test.com', fakeUser, 'STAFF'));

    expect(repository.isMember).toHaveBeenCalledWith(asBarId('bar-1'), 'new@test.com');
    expect(eventBus.publish).toHaveBeenCalledWith(
      new PrepareUserForInviteEvent(asBarId('bar-1'), 'new@test.com', 'STAFF', 'en'),
    );
  });

  it('should throw ConflictException if the user is already a member', async () => {
    repository.isMember.mockResolvedValue(true);

    await expect(
      handler.execute(new PrepareInviteMemberCommand(asBarId('bar-1'), 'new@test.com', fakeUser, 'STAFF')),
    ).rejects.toThrow(ConflictException);

    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
