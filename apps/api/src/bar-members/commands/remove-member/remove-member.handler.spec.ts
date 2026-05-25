import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoveMemberHandler } from './remove-member.handler';
import { RemoveMemberCommand } from './remove-member.command';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { BarGateway } from '../../../core';
import { asBarId, asBarMemberId, SocketEvents } from '@coaster/common';

describe('RemoveMemberHandler', () => {
  let handler: RemoveMemberHandler;
  let repository = {
    getMembersByBar: vi.fn(),
    removeMember: vi.fn(),
  };
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveMemberHandler,
        { provide: BarMembersRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    handler = module.get<RemoveMemberHandler>(RemoveMemberHandler);
  });

  it('should remove member and emit event', async () => {
    const barId = asBarId('bar-1');
    const memberId = asBarMemberId('mem-1');
    repository.getMembersByBar.mockResolvedValue([
      { id: 'mem-1', role: 'EMPLOYEE' }
    ]);
    repository.removeMember.mockResolvedValue(undefined);

    await handler.execute(new RemoveMemberCommand(barId, memberId));

    expect(repository.removeMember).toHaveBeenCalledWith(memberId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.MEMBER_REMOVED, { id: memberId });
  });
});
