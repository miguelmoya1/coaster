import { Injectable, Logger } from '@nestjs/common';
import { ofType, Saga } from '@nestjs/cqrs';
import { map, Observable } from 'rxjs';
import { PrepareUserForInviteCommand } from '../commands';
import { PrepareUserForInviteEvent } from '../events';

@Injectable()
export class UserSagas {
  readonly #logger = new Logger(UserSagas.name);

  @Saga()
  prepareUserForInvite = (events$: Observable<any>) => {
    return events$.pipe(
      ofType(PrepareUserForInviteEvent),
      map((event) => {
        this.#logger.debug(`Catching PrepareUserForInviteEvent...`);
        return new PrepareUserForInviteCommand(event.email, {
          barId: event.barId,
          role: event.role,
          inviterLanguage: event.inviterLanguage,
        });
      }),
    );
  };
}
