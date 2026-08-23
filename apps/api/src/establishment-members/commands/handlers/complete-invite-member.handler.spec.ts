import { EstablishmentRole, asEstablishmentId, asUserId } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentMembersWriteRepository } from '../../data-access/establishment-members.write.repository';
import { MemberInvitedEvent } from '../../events';
import { CompleteInviteMemberCommand } from '../impl/complete-invite-member.command';
import { CompleteInviteMemberHandler } from './complete-invite-member.handler';

describe('CompleteInviteMemberHandler', () => {
  let handler: CompleteInviteMemberHandler;
  const repository = {
    invite: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompleteInviteMemberHandler,
        { provide: EstablishmentMembersWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<CompleteInviteMemberHandler>(CompleteInviteMemberHandler);
  });

  it('should invite and publish MemberInvitedEvent', async () => {
    repository.invite.mockResolvedValue({
      id: 'new-member',
      user: {
        name: 'User',
        email: 'new@test.com',
      },
      establishment: {
        name: 'Test Establishment',
      },
    });

    await handler.execute(
      new CompleteInviteMemberCommand(
        asUserId('user-1'),
        asEstablishmentId('establishment-1'),
        EstablishmentRole.STAFF,
        'en',
      ),
    );

    expect(repository.invite).toHaveBeenCalledWith('establishment-1', 'user-1', { role: EstablishmentRole.STAFF });
    expect(eventBus.publish).toHaveBeenCalledWith(
      new MemberInvitedEvent(
        asEstablishmentId('establishment-1'),
        expect.any(String),
        'new@test.com',
        'Test Establishment',
        'User',
        'en',
        asUserId('user-1'),
      ),
    );
  });

  it('should fail if the repository fails', async () => {
    repository.invite.mockRejectedValue(new NotFoundException());

    await expect(
      handler.execute(
        new CompleteInviteMemberCommand(
          asUserId('user-1'),
          asEstablishmentId('establishment-1'),
          EstablishmentRole.STAFF,
          'en',
        ),
      ),
    ).rejects.toThrow(NotFoundException);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
