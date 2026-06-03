import { Role } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asUserId, EmailService } from '../../../core';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { PrepareInviteMemberCommand } from './prepare-invite-member.command';
import { PrepareInviteMemberHandler } from './prepare-invite-member.handler';

describe('PrepareInviteMemberHandler', () => {
  let handler: PrepareInviteMemberHandler;
  const repository = {
    findBarById: vi.fn(),
    PrepareinviteMember: vi.fn(),
  };
  const emailService = {
    sendInviteEmail: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrepareInviteMemberHandler,
        { provide: BarMembersRepository, useValue: repository },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    handler = module.get<PrepareInviteMemberHandler>(PrepareInviteMemberHandler);
  });

  const fakeUser = {
    id: asUserId('admin-id'),
    name: 'Admin Name',
    email: 'admin@test.com',
    active: true,
    role: 'USER' as Role,
  };

  it('should invite and send email', async () => {
    repository.findBarById.mockResolvedValue({
      id: 'bar-1',
      name: 'Test Bar',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    repository.PrepareinviteMember.mockResolvedValue({
      id: 'new-member',
      userId: 'some-user',
      barId: 'bar-1',
      role: 'STAFF' as Role,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'some-user',
        name: 'User',
        email: 'user@test.com',
        photoUrl: 'img',
      },
    });

    const result = await handler.execute(
      new PrepareInviteMemberCommand(asBarId('bar-1'), 'new@test.com', fakeUser, 'STAFF'),
    );

    expect(repository.PrepareinviteMember).toHaveBeenCalledWith('bar-1', 'new@test.com', { role: 'STAFF' });
    expect(emailService.sendInviteEmail).toHaveBeenCalledWith('new@test.com', 'Test Bar', 'Admin Name');
    expect(result).toEqual({
      id: 'new-member',
      userId: 'some-user',
      barId: 'bar-1',
      role: 'STAFF' as Role,
      permissions: expect.any(Array),
      active: true,
      userName: 'User',
      userEmail: 'user@test.com',
      userImage: 'img',
    });
  });

  it('should fail if the bar does not exist and NOT send email', async () => {
    repository.findBarById.mockResolvedValue(null);

    await expect(
      handler.execute(new PrepareInviteMemberCommand(asBarId('bar-1'), 'new@test.com', fakeUser, 'STAFF')),
    ).rejects.toThrow(NotFoundException);
  });
});
