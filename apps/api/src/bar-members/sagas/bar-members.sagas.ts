import { Injectable, Logger } from '@nestjs/common';
import { ofType, Saga } from '@nestjs/cqrs';
import { map, Observable } from 'rxjs';
import { UserPreparedForInviteEvent } from '../../events';
import { InviteMemberCommand } from '../commands';

@Injectable()
export class BarMembersSagas {
  readonly #logger = new Logger(BarMembersSagas.name);

  @Saga()
  inviteMember = (events$: Observable<any>) => {
    return events$.pipe(
      ofType(UserPreparedForInviteEvent),
      map((event) => {
        this.#logger.debug(`Catching UserPreparedForInviteEvent...`);
        return new InviteMemberCommand(event.userId, event.barId, event.role, event.inviterLanguage);
      }),
    );
  };
}
