import { asBarId, asUserId, BarRole } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { EmailService, BarGateway } from '../../core';
import { BarMembersRepository } from '../data-access/bar-members.repository';
import { BarMembersService } from './bar-members.service';

describe('BarMembersService', () => {
  let service: BarMembersService;
  let repository: Mocked<BarMembersRepository>;
  let emailService: Mocked<EmailService>;

  beforeEach(async () => {
    const mockRepo = {
      findBarById: vi.fn(),
      inviteMember: vi.fn(),
      getMembersByBar: vi.fn(),
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
        BarMembersService,
        { provide: BarMembersRepository, useValue: mockRepo },
        { provide: EmailService, useValue: mockEmailService },
        { provide: BarGateway, useValue: mockBarGateway },
      ],
    }).compile();

    service = module.get<BarMembersService>(BarMembersService);
    repository = module.get(BarMembersRepository);
    emailService = module.get(EmailService);
  });

  describe('getMembers', () => {
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

      const result = await service.getMembers(asBarId('bar-1'));

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

  describe('invite', () => {
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
        user: { id: 'some-user', name: 'User', email: 'user@test.com', photoUrl: 'img' },
      });

      const result = await service.invite(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser);

      expect(repository.inviteMember).toHaveBeenCalledWith('bar-1', 'new@test.com', { role: BarRole.STAFF });
      expect(emailService.sendInviteEmail).toHaveBeenCalledWith('new@test.com', 'Test Bar', 'Admin Name');
      expect(result).toEqual({
        id: asUserId('new-member'),
        userId: asUserId('some-user'),
        barId: asBarId('bar-1'),
        role: BarRole.STAFF,
        active: true,
        userName: 'User',
        userEmail: 'user@test.com',
        userImage: 'img',
      });
    });

    it('should fail if the bar does not exist and NOT send email', async () => {
      repository.findBarById.mockResolvedValue(null);

      await expect(service.invite(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.invite(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser)).rejects.toThrow(
        ErrorCodes.BAR_NOT_FOUND,
      );

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

      await expect(service.invite(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.invite(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser)).rejects.toThrow(
        ErrorCodes.USER_ALREADY_MEMBER,
      );

      expect(emailService.sendInviteEmail).not.toHaveBeenCalled();
    });

    it('should propagate other Prisma errors', async () => {
      repository.findBarById.mockResolvedValue({
        id: 'bar-1',
        name: 'Test Bar',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const unknownError = new Error('Database down');
      repository.inviteMember.mockRejectedValue(unknownError);

      await expect(service.invite(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser)).rejects.toThrow(
        unknownError,
      );
    });
  });
});
