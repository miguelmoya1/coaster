import { Injectable } from '@nestjs/common';
import { ofType, Saga } from '@nestjs/cqrs';
import { map, Observable } from 'rxjs';
import { PrepareUserForInviteEvent } from '../../core';
import { PrepareUserForInviteCommand } from '../commands';

@Injectable()
export class UserSagas {
  @Saga()
  prepareUserForInvite = (events$: Observable<any>) => {
    return events$.pipe(
      ofType(PrepareUserForInviteEvent),
      map((event) => new PrepareUserForInviteCommand(event.email, { barId: event.barId, role: event.role })),
    );
  };
}
