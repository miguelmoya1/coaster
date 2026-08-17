import { MemberRemovedEvent } from '@coaster/establishment-members';
import { RealtimeEvents, asEstablishmentId, asEstablishmentMemberId, asUserId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { MemberRemovedHandler } from './member-removed.handler';

describe('MemberRemovedHandler', () => {
  let handler: MemberRemovedHandler;
  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemberRemovedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<MemberRemovedHandler>(MemberRemovedHandler);
  });

  it('should publish when member is removed', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const memberId = asEstablishmentMemberId('mem-1');
    const event = new MemberRemovedEvent(establishmentId, memberId, asUserId('user-1'));

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.memberRemoved, { id: memberId });
  });

  it('should close the stream of the removed user', () => {
    const establishmentId = asEstablishmentId('establishment-1');

    handler.handle(new MemberRemovedEvent(establishmentId, asEstablishmentMemberId('mem-1'), asUserId('user-1')));

    expect(realtime.revoke).toHaveBeenCalledWith(establishmentId, 'user-1');
  });
});
