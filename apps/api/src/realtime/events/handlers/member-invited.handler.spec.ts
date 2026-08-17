import { MemberInvitedEvent } from '@coaster/establishment-members';
import { RealtimeEvents, asEstablishmentId, asEstablishmentMemberId, asUserId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { MemberInvitedHandler } from './member-invited.handler';

describe('MemberInvitedHandler', () => {
  let handler: MemberInvitedHandler;

  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemberInvitedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<MemberInvitedHandler>(MemberInvitedHandler);
    vi.clearAllMocks();
  });

  it('should emit MEMBER_INVITED event to the establishment', () => {
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

    expect(realtime.publish).toHaveBeenCalledWith('establishment-1', RealtimeEvents.memberInvited, { id: 'mem-1' });
  });
});
