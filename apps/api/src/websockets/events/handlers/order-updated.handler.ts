import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderUpdatedEvent } from '@orders/events';
import { SocketEvents } from '../../../core';
import { BarGateway } from '../../bar.gateway';

@EventsHandler(OrderUpdatedEvent)
export class OrderUpdatedHandler implements IEventHandler<OrderUpdatedEvent> {
  readonly #logger = new Logger(OrderUpdatedHandler.name);

  constructor(private readonly _barGateway: BarGateway) {}

  handle(event: OrderUpdatedEvent) {
    this.#logger.debug(`Catching OrderUpdatedEvent...`);
    this._barGateway.server.to(event.barId).emit(SocketEvents.ORDER_UPDATED, event.order);
  }
}
