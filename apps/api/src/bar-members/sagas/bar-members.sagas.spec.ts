import { BarRole } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserPreparedForInviteEvent } from '@users/events';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { asBarId, asUserId } from '../../core';
import { CompleteInviteMemberCommand } from '../commands';
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

  describe('userPreparedForInvite', () => {
    it('should map UserPreparedForInviteEvent to CompleteInviteMemberCommand', () => {
      const userId = asUserId('user-1');
      const barId = asBarId('bar-1');
      const role: BarRole = 'STAFF';

      const event = new UserPreparedForInviteEvent(userId, barId, role, 'es');
      const events$ = of(event);

      const sagaObservable = sagas.userPreparedForInvite(events$);

      sagaObservable.subscribe((command) => {
        expect(command).toBeInstanceOf(CompleteInviteMemberCommand);
        expect((command as CompleteInviteMemberCommand).userId).toBe(userId);
        expect((command as CompleteInviteMemberCommand).barId).toBe(barId);
        expect((command as CompleteInviteMemberCommand).role).toBe(role);
        expect((command as CompleteInviteMemberCommand).inviterLanguage).toBe('es');
      });
    });
  });
});
