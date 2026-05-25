import { InviteMemberCommand, RemoveMemberCommand } from './commands';
import { GetMembersQuery } from './queries';
import { GetMembersHandler } from './queries/get-members/get-members.handler';
import { InviteMemberHandler } from './commands/invite-member/invite-member.handler';
import { RemoveMemberHandler } from './commands/remove-member/remove-member.handler';
import { asBarId, asUserId, BarRole, ErrorCodes } from '@coaster/common';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarMembersRepository } from './data-access/bar-members.repository';
import { BarGateway, EmailService } from '../core';

describe('BarMembers CQRS Handlers', () => {
  let getMembersHandler: GetMembersHandler;
  let inviteHandler: InviteMemberHandler;
  let removeHandler: RemoveMemberHandler;
  let repository: Mocked<BarMembersRepository>;
  let emailService: Mocked<EmailService>;

  beforeEach(async () => {
    const mockRepo = {
      findBarById: vi.fn(),
      inviteMember: vi.fn(),
      getMembersByBar: vi.fn(),
      removeMember: vi.fn(),
    };
    const mockEmailService = {
      sendInviteEmail: vi.fn(),
    };
    const mockBarGateway = {
      server: {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMembersHandler,
        InviteMemberHandler,
        RemoveMemberHandler,
        { provide: BarMembersRepository, useValue: mockRepo },
        { provide: EmailService, useValue: mockEmailService },
        { provide: BarGateway, useValue: mockBarGateway },
      ],
    }).compile();

    getMembersHandler = module.get<GetMembersHandler>(GetMembersHandler);
    inviteHandler = module.get<InviteMemberHandler>(InviteMemberHandler);
    removeHandler = module.get<RemoveMemberHandler>(RemoveMemberHandler);
    repository = module.get(BarMembersRepository);
    emailService = module.get(EmailService);
  });

  describe('GetMembersHandler', () => {
    it('should return the bar members', async () => {
      repository.getMembersByBar.mockResolvedValue([
        {
          id: 'member-1',
          userId: 'user-1',
          barId: 'bar-1',
          active: true,
          role: BarRole.OWNER,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-1',
            name: 'admin',
            photoUrl: 'http://user-1.jpg',
            email: 'admin@mail.com',
          },
        },
      ]);

      const result = await getMembersHandler.execute(new GetMembersQuery(asBarId('bar-1')));

      expect(repository.getMembersByBar).toHaveBeenCalledWith('bar-1');
      expect(result).toEqual([
        {
          id: 'member-1',
          userId: 'user-1',
          barId: 'bar-1',
          active: true,
          role: BarRole.OWNER,
          userName: 'admin',
          userImage: 'http://user-1.jpg',
          userEmail: 'admin@mail.com',
        },
      ]);
    });
  });

  describe('InviteMemberHandler', () => {
    const fakeUser = {
      id: asUserId('admin-id'),
      name: 'Admin Name',
      email: 'admin@test.com',
      active: true,
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

      const result = await inviteHandler.execute(
        new InviteMemberCommand(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser),
      );

      expect(repository.inviteMember).toHaveBeenCalledWith('bar-1', 'new@test.com', { role: BarRole.STAFF });
      expect(emailService.sendInviteEmail).toHaveBeenCalledWith('new@test.com', 'Test Bar', 'Admin Name');
      expect(result).toEqual({
        id: 'new-member',
        userId: 'some-user',
        barId: 'bar-1',
        role: BarRole.STAFF,
        active: true,
        userName: 'User',
        userEmail: 'user@test.com',
        userImage: 'img',
      });
    });

    it('should fail if the bar does not exist and NOT send email', async () => {
      repository.findBarById.mockResolvedValue(null);

      await expect(
        inviteHandler.execute(
          new InviteMemberCommand(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(repository.inviteMember).not.toHaveBeenCalled();
      expect(emailService.sendInviteEmail).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if user is already invited and NOT send email', async () => {
      repository.findBarById.mockResolvedValue({
        id: 'bar-1',
        name: 'Test Bar',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      repository.inviteMember.mockRejectedValue({ code: 'P2002' });

      await expect(
        inviteHandler.execute(
          new InviteMemberCommand(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser),
        ),
      ).rejects.toThrow(ConflictException);

      expect(emailService.sendInviteEmail).not.toHaveBeenCalled();
    });
  });
});
