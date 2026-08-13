import { CategoryUpdatedEvent } from '@coaster/categories';
import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(CategoryUpdatedEvent)
export class CategoryUpdatedHandler implements IEventHandler<CategoryUpdatedEvent> {
  readonly #logger = new Logger(CategoryUpdatedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: CategoryUpdatedEvent) {
    this.#logger.debug(`Catching CategoryUpdatedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.categoryUpdated, event.category);
  }
}
