import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ShiftDeletedEvent } from '@coaster/shifts';
import { RealtimeService } from '../../services';

@EventsHandler(ShiftDeletedEvent)
export class ShiftDeletedHandler implements IEventHandler<ShiftDeletedEvent> {
  readonly #logger = new Logger(ShiftDeletedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: ShiftDeletedEvent) {
    this.#logger.debug(`Catching ShiftDeletedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.shiftDeleted, { id: event.shiftId });
  }
}
