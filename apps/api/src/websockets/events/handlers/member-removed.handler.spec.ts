import { MemberRemovedEvent } from '@coaster/bar-members';
import { SocketEvents, asBarId, asBarMemberId, asUserId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../../bar.gateway';
import { MemberRemovedHandler } from './member-removed.handler';

describe('MemberRemovedHandler', () => {
  let handler: MemberRemovedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
    evictFromBar: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemberRemovedHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<MemberRemovedHandler>(MemberRemovedHandler);
  });

  it('should emit socket event when member is removed', async () => {
    const barId = asBarId('bar-1');
    const memberId = asBarMemberId('mem-1');
    const event = new MemberRemovedEvent(barId, memberId, asUserId('user-1'));

    await handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.memberRemoved, { id: memberId });
  });

  it('should pull the removed user out of the live bar room', async () => {
    const barId = asBarId('bar-1');

    await handler.handle(new MemberRemovedEvent(barId, asBarMemberId('mem-1'), asUserId('user-1')));

    expect(barGateway.evictFromBar).toHaveBeenCalledWith(barId, 'user-1');
  });
});
