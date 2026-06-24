import { InviteMemberRequestedEvent } from '@bar-members/events';
import { Injectable, Logger } from '@nestjs/common';
import { ofType, Saga } from '@nestjs/cqrs';
import { map, Observable } from 'rxjs';
import { PrepareUserForInviteCommand } from '../commands';

@Injectable()
export class UserSagas {
  readonly #logger = new Logger(UserSagas.name);

  @Saga()
  inviteMemberRequested = (events$: Observable<any>) => {
    return events$.pipe(
      ofType(InviteMemberRequestedEvent),
      map((event) => {
        this.#logger.debug(`Catching InviteMemberRequestedEvent...`);
        return new PrepareUserForInviteCommand(event.email, {
          barId: event.barId,
          role: event.role,
          inviterLanguage: event.inviterLanguage,
        });
      }),
    );
  };
}
