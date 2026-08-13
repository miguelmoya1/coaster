import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ShiftDeletedEvent } from '@coaster/shifts';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(ShiftDeletedEvent)
export class ShiftDeletedHandler implements IEventHandler<ShiftDeletedEvent> {
  readonly #logger = new Logger(ShiftDeletedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: ShiftDeletedEvent) {
    this.#logger.debug(`Catching ShiftDeletedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.shiftDeleted, { id: event.shiftId });
  }
}
