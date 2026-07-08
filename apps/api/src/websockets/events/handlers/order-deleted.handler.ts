import { SocketEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderDeletedEvent } from '@orders/events';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(OrderDeletedEvent)
export class OrderDeletedHandler implements IEventHandler<OrderDeletedEvent> {
  readonly #logger = new Logger(OrderDeletedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderDeletedEvent) {
    this.#logger.debug(`Catching OrderDeletedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.orderDeleted, { id: event.orderId });
  }
}
