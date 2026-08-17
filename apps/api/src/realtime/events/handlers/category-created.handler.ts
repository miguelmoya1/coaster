import { CategoryCreatedEvent } from '@coaster/categories';
import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(CategoryCreatedEvent)
export class CategoryCreatedHandler implements IEventHandler<CategoryCreatedEvent> {
  readonly #logger = new Logger(CategoryCreatedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: CategoryCreatedEvent) {
    this.#logger.debug(`Catching CategoryCreatedEvent...`);
    this._establishmentGateway.server.to(event.establishmentId).emit(SocketEvents.categoryCreated, event.category);
  }
}
