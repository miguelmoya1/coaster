import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ShiftDeletedEvent } from '@shifts/events';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(ShiftDeletedEvent)
export class ShiftDeletedHandler implements IEventHandler<ShiftDeletedEvent> {
  readonly #logger = new Logger(ShiftDeletedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: ShiftDeletedEvent) {
    this.#logger.debug(`Catching ShiftDeletedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.shiftDeleted, { id: event.shiftId });
  }
}
