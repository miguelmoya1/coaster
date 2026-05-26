import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderItemRemovedEvent } from './order-item-removed.event';

@EventsHandler(OrderItemRemovedEvent)
export class OrderItemRemovedHandler implements IEventHandler<OrderItemRemovedEvent> {
  handle(event: OrderItemRemovedEvent) {
    // Saga handles the actual stock adjustment as part of business logic coordination.
  }
}
