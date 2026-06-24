import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ShiftCreatedEvent } from '@shifts/events';
import { SocketEvents } from '../../../core';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(ShiftCreatedEvent)
export class ShiftCreatedHandler implements IEventHandler<ShiftCreatedEvent> {
  readonly #logger = new Logger(ShiftCreatedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: ShiftCreatedEvent) {
    this.#logger.debug(`Catching ShiftCreatedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.SHIFT_CREATED, event.shift);
  }
}
