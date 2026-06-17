import { asBarId, asBarMemberId } from '../../../core';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarMembersWriteRepository } from '../../data-access/bar-members.write.repository';
import { MemberRemovedEvent } from '../../../events';
import { RemoveMemberCommand } from './remove-member.command';
import { RemoveMemberHandler } from './remove-member.handler';
import { BarMembersReadRepository } from "../../data-access/bar-members.read.repository";

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveMemberHandler,
        { provide: BarMembersWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
            { provide: BarMembersReadRepository, useValue: repository }
        ],
    }).compile();

    handler = module.get<RemoveMemberHandler>(RemoveMemberHandler);
  });

  it('should remove member and publish event', async () => {
    const barId = asBarId('bar-1');
    const memberId = asBarMemberId('mem-1');
    repository.getMembersByBar.mockResolvedValue([{ id: 'mem-1', role: 'EMPLOYEE' }]);
    repository.delete.mockResolvedValue(true);

    await handler.execute(new RemoveMemberCommand(barId, memberId));

    expect(repository.delete).toHaveBeenCalledWith(barId, memberId);
    expect(eventBus.publish).toHaveBeenCalledWith(new MemberRemovedEvent(barId, memberId));
  });
});
