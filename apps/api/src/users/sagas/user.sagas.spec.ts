import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { UserSagas } from './user.sagas';
import { PrepareUserForInviteEvent } from '../../events';
import { PrepareUserForInviteCommand } from '../commands';
import { asBarId } from '../../core';
import { BarRole } from '@coaster/common';

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

  describe('prepareUserForInvite', () => {
    it('should map PrepareUserForInviteEvent to PrepareUserForInviteCommand', () => {
      const email = 'test@example.com';
      const barId = asBarId('bar-1');
      const role: BarRole = 'STAFF';

      const event = new PrepareUserForInviteEvent(barId, email, role);
      const events$ = of(event);

      const sagaObservable = sagas.prepareUserForInvite(events$);

      sagaObservable.subscribe((command) => {
        expect(command).toBeInstanceOf(PrepareUserForInviteCommand);
        expect((command as PrepareUserForInviteCommand).email).toBe(email);
        expect((command as PrepareUserForInviteCommand).extraData.barId).toBe(barId);
        expect((command as PrepareUserForInviteCommand).extraData.role).toBe(role);
      });
    });
  });
});
