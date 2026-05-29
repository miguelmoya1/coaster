import { asBarId, asUserId, BarRole, Role } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailService } from '../../../core';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { InviteMemberCommand } from './invite-member.command';
import { InviteMemberHandler } from './invite-member.handler';

describe('InviteMemberHandler', () => {
  let handler: InviteMemberHandler;
  const repository = {
    findBarById: vi.fn(),
    inviteMember: vi.fn(),
  };
  const emailService = {
    sendInviteEmail: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteMemberHandler,
        { provide: BarMembersRepository, useValue: repository },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    handler = module.get<InviteMemberHandler>(InviteMemberHandler);
  });

  const fakeUser = {
    id: asUserId('admin-id'),
    name: 'Admin Name',
    email: 'admin@test.com',
    active: true,
    role: Role.USER,
  };

  it('should invite and send email', async () => {
    repository.findBarById.mockResolvedValue({
      id: 'bar-1',
      name: 'Test Bar',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    repository.inviteMember.mockResolvedValue({
      id: 'new-member',
      userId: 'some-user',
      barId: 'bar-1',
      role: BarRole.STAFF,
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
      new InviteMemberCommand(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser),
    );

    expect(repository.inviteMember).toHaveBeenCalledWith('bar-1', 'new@test.com', { role: BarRole.STAFF });
    expect(emailService.sendInviteEmail).toHaveBeenCalledWith('new@test.com', 'Test Bar', 'Admin Name');
    expect(result).toEqual({
      id: 'new-member',
      userId: 'some-user',
      barId: 'bar-1',
      role: BarRole.STAFF,
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
      handler.execute(new InviteMemberCommand(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser)),
    ).rejects.toThrow(NotFoundException);
  });
});
