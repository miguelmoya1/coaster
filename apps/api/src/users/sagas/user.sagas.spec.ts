import { BarRole } from '@coaster/common';
import { InviteMemberRequestedEvent } from '@bar-members/events';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { asBarId } from '../../core';
import { PrepareUserForInviteCommand } from '../commands';
import { UserSagas } from './user.sagas';

describe('UserSagas', () => {
  let sagas: UserSagas;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserSagas],
    }).compile();

    sagas = module.get<UserSagas>(UserSagas);
  });

  it('should be defined', () => {
    expect(sagas).toBeDefined();
  });

  describe('inviteMemberRequested', () => {
    it('should map InviteMemberRequestedEvent to PrepareUserForInviteCommand', () => {
      const barId = asBarId('bar-1');
      const email = 'new@test.com';
      const role: BarRole = 'STAFF';

      const event = new InviteMemberRequestedEvent(barId, email, role, 'es');
      const events$ = of(event);

      const sagaObservable = sagas.inviteMemberRequested(events$);

      sagaObservable.subscribe((command) => {
        expect(command).toBeInstanceOf(PrepareUserForInviteCommand);
        expect((command as PrepareUserForInviteCommand).email).toBe(email);
        expect((command as PrepareUserForInviteCommand).extraData.barId).toBe(barId);
        expect((command as PrepareUserForInviteCommand).extraData.role).toBe(role);
        expect((command as PrepareUserForInviteCommand).extraData.inviterLanguage).toBe('es');
      });
    });
  });
});
