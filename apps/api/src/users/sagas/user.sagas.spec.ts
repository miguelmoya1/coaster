import { BarRole } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { asBarId } from '../../core';
import { PrepareUserForInviteCommand } from '../commands';
import { PrepareUserForInviteEvent } from '../events';
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
