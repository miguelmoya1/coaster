import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ShiftCreatedEvent } from '@coaster/shifts';
import { RealtimeService } from '../../services';

@EventsHandler(ShiftCreatedEvent)
export class ShiftCreatedHandler implements IEventHandler<ShiftCreatedEvent> {
  readonly #logger = new Logger(ShiftCreatedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: ShiftCreatedEvent) {
    this.#logger.debug(`Catching ShiftCreatedEvent...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.shiftCreated, event.shift);
  }
}
