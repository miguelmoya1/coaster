import { MemberRemovedEvent } from '@coaster/establishment-members';
import { SocketEvents, asEstablishmentId, asEstablishmentMemberId, asUserId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { MemberRemovedHandler } from './member-removed.handler';

describe('MemberRemovedHandler', () => {
  let handler: MemberRemovedHandler;
  const establishmentGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
    evictFromEstablishment: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemberRemovedHandler, { provide: EstablishmentGateway, useValue: establishmentGateway }],
    }).compile();

    handler = module.get<MemberRemovedHandler>(MemberRemovedHandler);
  });

  it('should emit socket event when member is removed', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const memberId = asEstablishmentMemberId('mem-1');
    const event = new MemberRemovedEvent(establishmentId, memberId, asUserId('user-1'));

    await handler.handle(event);

    expect(establishmentGateway.server.to).toHaveBeenCalledWith(establishmentId);
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.memberRemoved, { id: memberId });
  });

  it('should pull the removed user out of the live establishment room', async () => {
    const establishmentId = asEstablishmentId('establishment-1');

    await handler.handle(new MemberRemovedEvent(establishmentId, asEstablishmentMemberId('mem-1'), asUserId('user-1')));

    expect(establishmentGateway.evictFromEstablishment).toHaveBeenCalledWith(establishmentId, 'user-1');
  });
});
