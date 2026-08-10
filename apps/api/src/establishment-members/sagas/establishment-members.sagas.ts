import { Injectable, Logger } from '@nestjs/common';
import { ofType, Saga } from '@nestjs/cqrs';
import { UserPreparedForInviteEvent } from '@coaster/users';
import { map, Observable } from 'rxjs';
import { CompleteInviteMemberCommand } from '../commands';

@Injectable()
export class EstablishmentMembersSagas {
  readonly #logger = new Logger(EstablishmentMembersSagas.name);

  @Saga()
  userPreparedForInvite = (events$: Observable<any>) => {
    return events$.pipe(
      ofType(UserPreparedForInviteEvent),
      map((event) => {
        this.#logger.debug(`Catching UserPreparedForInviteEvent...`);
        return new CompleteInviteMemberCommand(event.userId, event.establishmentId, event.role, event.inviterLanguage);
      }),
    );
  };
}
