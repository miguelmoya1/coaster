import { asBarId, asBarMemberId, asUserId } from '@coaster/common';
import { BadRequestException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarMembersReadRepository } from '../../data-access/bar-members.read.repository';
import { BarMembersWriteRepository } from '../../data-access/bar-members.write.repository';
import { MemberRemovedEvent } from '../../events';
import { RemoveMemberCommand } from '../impl/remove-member.command';
import { RemoveMemberHandler } from './remove-member.handler';

describe('RemoveMemberHandler', () => {
  let handler: RemoveMemberHandler;
  const repository = {
    getMembersByBar: vi.fn(),
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
        { provide: BarMembersWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
        { provide: BarMembersReadRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<RemoveMemberHandler>(RemoveMemberHandler);
  });

  it('should remove member and publish event', async () => {
    const barId = asBarId('bar-1');
    const memberId = asBarMemberId('mem-1');
    repository.getMembersByBar.mockResolvedValue([{ id: 'mem-1', role: 'EMPLOYEE', userId: 'user-1' }]);
    repository.delete.mockResolvedValue(true);

    await handler.execute(new RemoveMemberCommand(barId, memberId));

    expect(repository.delete).toHaveBeenCalledWith(barId, memberId);
    expect(eventBus.publish).toHaveBeenCalledWith(new MemberRemovedEvent(barId, memberId, asUserId('user-1')));
  });

  it('should refuse a member that does not belong to the bar without touching the database', async () => {
    repository.getMembersByBar.mockResolvedValue([{ id: 'other', role: 'STAFF', userId: 'user-2' }]);

    await expect(
      handler.execute(new RemoveMemberCommand(asBarId('bar-1'), asBarMemberId('mem-1'))),
    ).rejects.toThrow(BadRequestException);

    expect(repository.delete).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
