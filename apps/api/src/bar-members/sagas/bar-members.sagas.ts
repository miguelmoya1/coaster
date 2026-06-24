import { Injectable, Logger } from '@nestjs/common';
import { ofType, Saga } from '@nestjs/cqrs';
import { UserPreparedForInviteEvent } from '@users/events';
import { map, Observable } from 'rxjs';
import { CompleteInviteMemberCommand } from '../commands';

@Injectable()
export class BarMembersSagas {
  readonly #logger = new Logger(BarMembersSagas.name);

  @Saga()
  userPreparedForInvite = (events$: Observable<any>) => {
    return events$.pipe(
      ofType(UserPreparedForInviteEvent),
      map((event) => {
        this.#logger.debug(`Catching UserPreparedForInviteEvent...`);
        return new CompleteInviteMemberCommand(event.userId, event.barId, event.role, event.inviterLanguage);
      }),
    );
  };
}
