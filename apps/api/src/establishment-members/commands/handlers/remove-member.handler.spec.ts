import { asEstablishmentId, asEstablishmentMemberId, asUserId } from '@coaster/common';
import { BadRequestException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentMembersReadRepository } from '../../data-access/establishment-members.read.repository';
import { EstablishmentMembersWriteRepository } from '../../data-access/establishment-members.write.repository';
import { MemberRemovedEvent } from '../../events';
import { RemoveMemberCommand } from '../impl/remove-member.command';
import { RemoveMemberHandler } from './remove-member.handler';

describe('RemoveMemberHandler', () => {
  let handler: RemoveMemberHandler;
  const repository = {
    getMembersByEstablishment: vi.fn(),
    delete: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveMemberHandler,
        { provide: EstablishmentMembersWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
        { provide: EstablishmentMembersReadRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<RemoveMemberHandler>(RemoveMemberHandler);
  });

  it('should remove member and publish event', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const memberId = asEstablishmentMemberId('mem-1');
    repository.getMembersByEstablishment.mockResolvedValue([{ id: 'mem-1', role: 'EMPLOYEE', userId: 'user-1' }]);
    repository.delete.mockResolvedValue(true);

    await handler.execute(new RemoveMemberCommand(establishmentId, memberId));

    expect(repository.delete).toHaveBeenCalledWith(establishmentId, memberId);
    expect(eventBus.publish).toHaveBeenCalledWith(
      new MemberRemovedEvent(establishmentId, memberId, asUserId('user-1')),
    );
  });

  it('should refuse a member that does not belong to the establishment without touching the database', async () => {
    repository.getMembersByEstablishment.mockResolvedValue([{ id: 'other', role: 'STAFF', userId: 'user-2' }]);

    await expect(
      handler.execute(new RemoveMemberCommand(asEstablishmentId('establishment-1'), asEstablishmentMemberId('mem-1'))),
    ).rejects.toThrow(BadRequestException);

    expect(repository.delete).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
