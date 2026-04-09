import { asBarId, asUserId, BarRole } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../../core';
import { BarMembersRepository } from '../data-access/bar-members.repository';
import { BarMembersService } from './bar-members.service';

describe('BarMembersService', () => {
  let service: BarMembersService;
  let repository: jest.Mocked<BarMembersRepository>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const mockRepo = {
      findBarById: jest.fn(),
      inviteMember: jest.fn(),
      getMembersByBar: jest.fn(),
    };
    const mockEmailService = {
      sendInviteEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarMembersService,
        { provide: BarMembersRepository, useValue: mockRepo },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<BarMembersService>(BarMembersService);
    repository = module.get(BarMembersRepository);
    emailService = module.get(EmailService);
  });

  describe('getMembers', () => {
    it('debería devolver los miembros del bar', async () => {
      repository.getMembersByBar.mockResolvedValue([{ id: 'member-1' }] as any);

      const result = await service.getMembers(asBarId('bar-1'));

      expect(repository.getMembersByBar).toHaveBeenCalledWith('bar-1');
      expect(result).toEqual([{ id: 'member-1' }]);
    });
  });

  describe('invite', () => {
    const fakeUser = {
      id: asUserId('admin-id'),
      name: 'Admin Name',
      email: 'admin@test.com',
      active: true,
    };

    it('debería invitar y mandar email', async () => {
      repository.findBarById.mockResolvedValue({
        id: 'bar-1',
        name: 'Test Bar',
      } as any);

      repository.inviteMember.mockResolvedValue({
        id: 'new-member',
      } as any);

      const result = await service.invite(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser);

      expect(repository.inviteMember).toHaveBeenCalledWith('bar-1', 'new@test.com', { role: BarRole.STAFF });
      expect(emailService.sendInviteEmail).toHaveBeenCalledWith('new@test.com', 'Test Bar', 'Admin Name');
      expect(result).toEqual({ id: 'new-member' });
    });

    it('debería fallar si el bar no existe y NO mandar email', async () => {
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

    it('debería lanzar ConflictException si el usuario ya está invitado y NO mandar email', async () => {
      repository.findBarById.mockResolvedValue({
        id: 'bar-1',
        name: 'Test Bar',
      } as any);

      repository.inviteMember.mockRejectedValue({ code: 'P2002' });

      await expect(service.invite(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.invite(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser)).rejects.toThrow(
        ErrorCodes.USER_ALREADY_MEMBER,
      );

      expect(emailService.sendInviteEmail).not.toHaveBeenCalled();
    });

    it('debería propagar otros errores Prisma', async () => {
      repository.findBarById.mockResolvedValue({
        id: 'bar-1',
        name: 'Test Bar',
      } as any);

      const unknownError = new Error('Database down');
      repository.inviteMember.mockRejectedValue(unknownError);

      await expect(service.invite(asBarId('bar-1'), 'new@test.com', BarRole.STAFF, fakeUser)).rejects.toThrow(
        unknownError,
      );
    });
  });
});
