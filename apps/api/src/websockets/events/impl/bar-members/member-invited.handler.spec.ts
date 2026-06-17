import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemberInvitedHandler } from './member-invited.handler';
import { BarGateway } from '../../../bar.gateway';
import { MemberInvitedEvent } from '../../../../events';
import { asBarId, asUserId, SocketEvents } from '../../../../core';

describe('MemberInvitedHandler', () => {
  let handler: MemberInvitedHandler;
  let barGateway: BarGateway;

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
    barGateway = module.get<BarGateway>(BarGateway);
    vi.clearAllMocks();
  });

  it('should emit MEMBER_INVITED event to the correct bar room', () => {
    const event = new MemberInvitedEvent(asBarId('bar-1'), asUserId('user-1'));
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('bar-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.MEMBER_INVITED, { id: 'user-1' });
  });
});
