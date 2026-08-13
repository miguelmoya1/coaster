import { EstablishmentRole, asEstablishmentId, asRole, asUserId } from '@coaster/common';
import { SecurityRepository } from '@coaster/core';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentMembersReadRepository } from '../../data-access/establishment-members.read.repository';
import { InviteMemberRequestedEvent } from '../../events';
import { InviteMemberCommand } from '../impl/invite-member.command';
import { InviteMemberHandler } from './invite-member.handler';

describe('InviteMemberHandler', () => {
  let handler: InviteMemberHandler;
  const repository = {
    isMember: vi.fn(),
  };
  const security = {
    getEstablishmentMemberRole: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteMemberHandler,
        { provide: EstablishmentMembersReadRepository, useValue: repository },
        { provide: SecurityRepository, useValue: security },
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

    await handler.execute(
      new InviteMemberCommand(asEstablishmentId('establishment-1'), 'new@test.com', fakeUser, EstablishmentRole.STAFF),
    );

    expect(repository.isMember).toHaveBeenCalledWith(asEstablishmentId('establishment-1'), 'new@test.com');
    expect(eventBus.publish).toHaveBeenCalledWith(
      new InviteMemberRequestedEvent(
        asEstablishmentId('establishment-1'),
        'new@test.com',
        EstablishmentRole.STAFF,
        'en',
      ),
    );
  });

  it('should throw ConflictException if the user is already a member', async () => {
    repository.isMember.mockResolvedValue(true);

    await expect(
      handler.execute(
        new InviteMemberCommand(
          asEstablishmentId('establishment-1'),
          'new@test.com',
          fakeUser,
          EstablishmentRole.STAFF,
        ),
      ),
    ).rejects.toThrow(ConflictException);

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  describe('handing out the OWNER role', () => {
    it('should refuse a manager inviting somebody as owner', async () => {
      security.getEstablishmentMemberRole.mockResolvedValue({ role: EstablishmentRole.MANAGER, active: true });

      await expect(
        handler.execute(
          new InviteMemberCommand(
            asEstablishmentId('establishment-1'),
            'new@test.com',
            fakeUser,
            EstablishmentRole.OWNER,
          ),
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(repository.isMember).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should refuse somebody whose membership was removed', async () => {
      security.getEstablishmentMemberRole.mockResolvedValue(null);

      await expect(
        handler.execute(
          new InviteMemberCommand(
            asEstablishmentId('establishment-1'),
            'new@test.com',
            fakeUser,
            EstablishmentRole.OWNER,
          ),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should let an owner invite another owner', async () => {
      security.getEstablishmentMemberRole.mockResolvedValue({ role: EstablishmentRole.OWNER, active: true });
      repository.isMember.mockResolvedValue(false);

      await handler.execute(
        new InviteMemberCommand(
          asEstablishmentId('establishment-1'),
          'new@test.com',
          fakeUser,
          EstablishmentRole.OWNER,
        ),
      );

      expect(eventBus.publish).toHaveBeenCalledWith(
        new InviteMemberRequestedEvent(
          asEstablishmentId('establishment-1'),
          'new@test.com',
          EstablishmentRole.OWNER,
          'en',
        ),
      );
    });

    it('should let a platform admin invite an owner without a membership of their own', async () => {
      repository.isMember.mockResolvedValue(false);

      await handler.execute(
        new InviteMemberCommand(
          asEstablishmentId('establishment-1'),
          'new@test.com',
          { ...fakeUser, role: asRole('ADMIN') },
          EstablishmentRole.OWNER,
        ),
      );

      expect(security.getEstablishmentMemberRole).not.toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should not ask about the inviter when the role is not OWNER', async () => {
      repository.isMember.mockResolvedValue(false);

      await handler.execute(
        new InviteMemberCommand(
          asEstablishmentId('establishment-1'),
          'new@test.com',
          fakeUser,
          EstablishmentRole.MANAGER,
        ),
      );

      expect(security.getEstablishmentMemberRole).not.toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });
});
