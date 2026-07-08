import { MemberInvitedEvent } from '@bar-members/events';
import { SocketEvents } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asBarMemberId } from '../../../core';
import { BarGateway } from '../../bar.gateway';
import { MemberInvitedHandler } from './member-invited.handler';

describe('MemberInvitedHandler', () => {
  let handler: MemberInvitedHandler;

  const mockEmit = vi.fn();
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberInvitedHandler,
        {
          provide: BarGateway,
          useValue: {
            server: {
              to: mockTo,
            },
          },
        },
      ],
    }).compile();

    handler = module.get<MemberInvitedHandler>(MemberInvitedHandler);
    vi.clearAllMocks();
  });

  it('should emit MEMBER_INVITED event to the correct bar room', () => {
    const event = new MemberInvitedEvent(
      asBarId('bar-1'),
      asBarMemberId('mem-1'),
      'new@test.com',
      'Test Bar',
      'User',
      'en',
    );
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('bar-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.memberInvited, { id: 'mem-1' });
  });
});
