import { asBarId, asBarMemberId } from '../../../core';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { MemberRemovedEvent } from '../../events';
import { RemoveMemberCommand } from './remove-member.command';
import { RemoveMemberHandler } from './remove-member.handler';

describe('RemoveMemberHandler', () => {
  let handler: RemoveMemberHandler;
  const repository = {
    getMembersByBar: vi.fn(),
    removeMember: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveMemberHandler,
        { provide: BarMembersRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<RemoveMemberHandler>(RemoveMemberHandler);
  });

  it('should remove member and publish event', async () => {
    const barId = asBarId('bar-1');
    const memberId = asBarMemberId('mem-1');
    repository.getMembersByBar.mockResolvedValue([{ id: 'mem-1', role: 'EMPLOYEE' }]);
    repository.removeMember.mockResolvedValue(undefined);

    await handler.execute(new RemoveMemberCommand(barId, memberId));

    expect(repository.removeMember).toHaveBeenCalledWith(memberId);
    expect(eventBus.publish).toHaveBeenCalledWith(new MemberRemovedEvent(barId, memberId));
  });
});
