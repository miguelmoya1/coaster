import { Injectable } from '@nestjs/common';
import { ICommand, ofType, Saga } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { AdjustProductStockCommand } from '../../products/commands/adjust-product-stock/adjust-product-stock.command';
import { OrderCancelledEvent } from '../events/order-cancelled/order-cancelled.event';
import { OrderCreatedEvent } from '../events/order-created/order-created.event';
import { OrderItemRemovedEvent } from '../events/order-item-removed/order-item-removed.event';
import { OrderItemsAddedEvent } from '../events/order-items-added/order-items-added.event';

@Injectable()
export class OrdersSagas {
  @Saga()
  handleStockManagement = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(OrderCreatedEvent, OrderItemsAddedEvent, OrderItemRemovedEvent, OrderCancelledEvent),
      mergeMap((event) => this.#mapEventToCommands(event)),
    );
  };

  #mapEventToCommands(event: unknown): ICommand[] {
    if (event instanceof OrderCreatedEvent) {
      return this.#handleOrderCreated(event);
    }
    if (event instanceof OrderItemsAddedEvent) {
      return this.#handleOrderItemsAdded(event);
    }
    if (event instanceof OrderItemRemovedEvent) {
      return this.#handleOrderItemRemoved(event);
    }
    if (event instanceof OrderCancelledEvent) {
      return this.#handleOrderCancelled(event);
    }
    return [];
  }

  #handleOrderCreated(event: OrderCreatedEvent): ICommand[] {
    return event.order.items.map((item) => new AdjustProductStockCommand(event.barId, item.productId, -item.quantity));
  }

  #handleOrderItemsAdded(event: OrderItemsAddedEvent): ICommand[] {
    return event.addedItems.map((item) => new AdjustProductStockCommand(event.barId, item.productId, -item.quantity));
  }

  #handleOrderItemRemoved(event: OrderItemRemovedEvent): ICommand[] {
    return [new AdjustProductStockCommand(event.barId, event.removedItem.productId, event.removedItem.quantity)];
  }

  #handleOrderCancelled(event: OrderCancelledEvent): ICommand[] {
    return event.order.items.map((item) => new AdjustProductStockCommand(event.barId, item.productId, item.quantity));
  }
}
