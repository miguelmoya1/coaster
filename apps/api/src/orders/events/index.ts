import { OrderCreatedHandler } from './order-created/order-created.handler';
import { OrderItemsAddedHandler } from './order-items-added/order-items-added.handler';
import { OrderUpdatedHandler } from './order-updated/order-updated.handler';
import { OrderCancelledHandler } from './order-cancelled/order-cancelled.handler';
import { OrderClosedHandler } from './order-closed/order-closed.handler';
import { OrdersMergedHandler } from './orders-merged/orders-merged.handler';
import { OrderTableMovedHandler } from './order-table-moved/order-table-moved.handler';

export * from './order-created/order-created.event';
export * from './order-created/order-created.handler';
export * from './order-items-added/order-items-added.event';
export * from './order-items-added/order-items-added.handler';
export * from './order-updated/order-updated.event';
export * from './order-updated/order-updated.handler';
export * from './order-cancelled/order-cancelled.event';
export * from './order-cancelled/order-cancelled.handler';
export * from './order-closed/order-closed.event';
export * from './order-closed/order-closed.handler';
export * from './orders-merged/orders-merged.event';
export * from './orders-merged/orders-merged.handler';
export * from './order-table-moved/order-table-moved.event';
export * from './order-table-moved/order-table-moved.handler';

export const EventHandlers = [
  OrderCreatedHandler,
  OrderItemsAddedHandler,
  OrderUpdatedHandler,
  OrderCancelledHandler,
  OrderClosedHandler,
  OrdersMergedHandler,
  OrderTableMovedHandler,
];
