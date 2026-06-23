import { BarRole } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserPreparedForInviteEvent } from '@users/events';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { asBarId, asUserId } from '../../core';
import { InviteMemberCommand } from '../commands';
import { BarMembersSagas } from './bar-members.sagas';

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

      const event = new UserPreparedForInviteEvent(userId, barId, role, 'es');
      const events$ = of(event);

      const sagaObservable = sagas.inviteMember(events$);

      sagaObservable.subscribe((command) => {
        expect(command).toBeInstanceOf(InviteMemberCommand);
        expect((command as InviteMemberCommand).userId).toBe(userId);
        expect((command as InviteMemberCommand).barId).toBe(barId);
        expect((command as InviteMemberCommand).role).toBe(role);
        expect((command as InviteMemberCommand).inviterLanguage).toBe('es');
      });
    });
  });
});
