import { asBarId, asBarMemberId, SocketEvents } from '../../../core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../../../websockets';
import { MemberRemovedEvent } from './member-removed.event';
import { MemberRemovedHandler } from './member-removed.handler';

describe('MemberRemovedHandler', () => {
  let handler: MemberRemovedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemberRemovedHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<MemberRemovedHandler>(MemberRemovedHandler);
  });

  it('should emit socket event when member is removed', () => {
    const barId = asBarId('bar-1');
    const memberId = asBarMemberId('mem-1');
    const event = new MemberRemovedEvent(barId, memberId);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.MEMBER_REMOVED, { id: memberId });
  });
});
