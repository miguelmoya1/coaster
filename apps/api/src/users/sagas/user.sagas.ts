import { Injectable, Logger } from '@nestjs/common';
import { ofType, Saga } from '@nestjs/cqrs';
import { map, Observable } from 'rxjs';
import { PrepareUserForInviteEvent } from '../../core';
import { PrepareUserForInviteCommand } from '../commands';

@Injectable()
export class UserSagas {
  readonly #logger = new Logger(UserSagas.name);
  @Saga()
  prepareUserForInvite = (events$: Observable<any>) => {
    return events$.pipe(
      ofType(PrepareUserForInviteEvent),
      map((event) => {
        this.#logger.debug(`prepareUserForInvite ${event.email}`);
        return new PrepareUserForInviteCommand(event.email, { barId: event.barId, role: event.role });
      }),
    );
  };
}
