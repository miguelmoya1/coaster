import { MemberInvitedEvent } from '@coaster/establishment-members';
import { SocketEvents, asEstablishmentId, asEstablishmentMemberId, asUserId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
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
          provide: EstablishmentGateway,
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

  it('should emit MEMBER_INVITED event to the correct establishment room', () => {
    const event = new MemberInvitedEvent(
      asEstablishmentId('establishment-1'),
      asEstablishmentMemberId('mem-1'),
      'new@test.com',
      'Test Establishment',
      'User',
      'en',
      asUserId('user-1'),
    );
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('establishment-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.memberInvited, { id: 'mem-1' });
  });
});
