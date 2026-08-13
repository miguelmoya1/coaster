import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ShiftCreatedEvent } from '@coaster/shifts';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(ShiftCreatedEvent)
export class ShiftCreatedHandler implements IEventHandler<ShiftCreatedEvent> {
  readonly #logger = new Logger(ShiftCreatedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: ShiftCreatedEvent) {
    this.#logger.debug(`Catching ShiftCreatedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.shiftCreated, event.shift);
  }
}
