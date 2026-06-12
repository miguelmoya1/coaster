import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@nestjs/cqrs';
import { asBarId } from '../../../core';
import { PrepareUserForInviteEvent } from '../../../events';

import { PrepareInviteMemberCommand } from './prepare-invite-member.command';
import { PrepareInviteMemberHandler } from './prepare-invite-member.handler';
import { BarMembersReadRepository } from "../../data-access/bar-members.read.repository";

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
    id: 'admin-id' as any,
    name: 'Admin Name',
    email: 'admin@test.com',
    active: true,
    role: 'USER' as any,
  };

  it('should publish PrepareUserForInviteEvent when member is not registered', async () => {
    repository.isMember.mockResolvedValue(false);

    await handler.execute(new PrepareInviteMemberCommand(asBarId('bar-1'), 'new@test.com', fakeUser, 'STAFF'));

    expect(repository.isMember).toHaveBeenCalledWith(asBarId('bar-1'), 'new@test.com');
    expect(eventBus.publish).toHaveBeenCalledWith(new PrepareUserForInviteEvent(asBarId('bar-1'), 'new@test.com', 'STAFF'));
  });

  it('should throw ConflictException if the user is already a member', async () => {
    repository.isMember.mockResolvedValue(true);

    await expect(
      handler.execute(new PrepareInviteMemberCommand(asBarId('bar-1'), 'new@test.com', fakeUser, 'STAFF')),
    ).rejects.toThrow(ConflictException);

    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
