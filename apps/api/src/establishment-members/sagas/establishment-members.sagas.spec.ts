import { EstablishmentRole, asEstablishmentId, asUserId } from '@coaster/common';
import { UserPreparedForInviteEvent } from '@coaster/users';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { CompleteInviteMemberCommand } from '../commands';
import { EstablishmentMembersSagas } from './establishment-members.sagas';

describe('EstablishmentMembersSagas', () => {
  let sagas: EstablishmentMembersSagas;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EstablishmentMembersSagas],
    }).compile();

    sagas = module.get<EstablishmentMembersSagas>(EstablishmentMembersSagas);
  });

  it('should be defined', () => {
    expect(sagas).toBeDefined();
  });

  describe('userPreparedForInvite', () => {
    it('should map UserPreparedForInviteEvent to CompleteInviteMemberCommand', () => {
      const userId = asUserId('user-1');
      const establishmentId = asEstablishmentId('establishment-1');
      const role: EstablishmentRole = 'STAFF';

      const event = new UserPreparedForInviteEvent(userId, establishmentId, role, 'es');
      const events$ = of(event);

      const sagaObservable = sagas.userPreparedForInvite(events$);

      sagaObservable.subscribe((command) => {
        expect(command).toBeInstanceOf(CompleteInviteMemberCommand);
        expect((command as CompleteInviteMemberCommand).userId).toBe(userId);
        expect((command as CompleteInviteMemberCommand).establishmentId).toBe(establishmentId);
        expect((command as CompleteInviteMemberCommand).role).toBe(role);
        expect((command as CompleteInviteMemberCommand).inviterLanguage).toBe('es');
      });
    });
  });
});
