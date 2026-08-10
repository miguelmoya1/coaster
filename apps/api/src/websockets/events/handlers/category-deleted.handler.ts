import { CategoryDeletedEvent } from '@coaster/categories';
import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EstablishmentGateway } from '../../establishment.gateway';

@EventsHandler(CategoryDeletedEvent)
export class CategoryDeletedHandler implements IEventHandler<CategoryDeletedEvent> {
  readonly #logger = new Logger(CategoryDeletedHandler.name);

  constructor(private readonly _establishmentGateway: EstablishmentGateway) {}

  handle(event: CategoryDeletedEvent) {
    this.#logger.debug(`Catching CategoryDeletedEvent...`);
    this._establishmentGateway.server
      .to(event.establishmentId)
      .emit(SocketEvents.categoryDeleted, { id: event.categoryId });
  }
}
