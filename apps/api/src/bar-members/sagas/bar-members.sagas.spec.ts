import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { BarMembersSagas } from './bar-members.sagas';
import { UserPreparedForInviteEvent } from '../../events';
import { InviteMemberCommand } from '../commands';
import { asBarId, asUserId } from '../../core';
import { BarRole } from '@coaster/common';

describe('BarMembersSagas', () => {
  let sagas: BarMembersSagas;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BarMembersSagas],
    }).compile();

    sagas = module.get<BarMembersSagas>(BarMembersSagas);
  });

  it('should be defined', () => {
    expect(sagas).toBeDefined();
  });

  describe('inviteMember', () => {
    it('should map UserPreparedForInviteEvent to InviteMemberCommand', () => {
      const userId = asUserId('user-1');
      const barId = asBarId('bar-1');
      const role: BarRole = 'STAFF';

      const event = new UserPreparedForInviteEvent(userId, barId, role);
      const events$ = of(event);

      const sagaObservable = sagas.inviteMember(events$);

      sagaObservable.subscribe((command) => {
        expect(command).toBeInstanceOf(InviteMemberCommand);
        expect((command as InviteMemberCommand).userId).toBe(userId);
        expect((command as InviteMemberCommand).barId).toBe(barId);
        expect((command as InviteMemberCommand).role).toBe(role);
      });
    });
  });
});
