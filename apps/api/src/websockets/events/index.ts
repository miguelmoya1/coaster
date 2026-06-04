import { MemberRemovedHandler } from './impl/bar-members/member-removed.handler';
import { TableCreatedHandler } from './impl/tables/table-created.handler';
import { TableUpdatedHandler } from './impl/tables/table-updated.handler';
import { TableDeletedHandler } from './impl/tables/table-deleted.handler';
import { CategoryDeletedHandler } from './impl/categories/category-deleted.handler';
import { ProductCreatedHandler } from './impl/products/product-created.handler';
import { ProductDeletedHandler } from './impl/products/product-deleted.handler';
import { ProductStockChangedHandler } from './impl/products/product-stock-changed.handler';
import { OrderCreatedHandler } from './impl/orders/order-created.handler';
import { OrderUpdatedHandler } from './impl/orders/order-updated.handler';
import { OrderCancelledHandler } from './impl/orders/order-cancelled.handler';
import { OrderClosedHandler } from './impl/orders/order-closed.handler';
import { OrderItemsAddedHandler } from './impl/orders/order-items-added.handler';
import { OrderTableMovedHandler } from './impl/orders/order-table-moved.handler';
import { OrdersMergedHandler } from './impl/orders/orders-merged.handler';

export * from './impl/bar-members/member-removed.handler';
export * from './impl/tables/table-created.handler';
export * from './impl/tables/table-updated.handler';
export * from './impl/tables/table-deleted.handler';
export * from './impl/categories/category-deleted.handler';
export * from './impl/products/product-created.handler';
export * from './impl/products/product-deleted.handler';
export * from './impl/products/product-stock-changed.handler';
export * from './impl/orders/order-created.handler';
export * from './impl/orders/order-updated.handler';
export * from './impl/orders/order-cancelled.handler';
export * from './impl/orders/order-closed.handler';
export * from './impl/orders/order-items-added.handler';
export * from './impl/orders/order-table-moved.handler';
export * from './impl/orders/orders-merged.handler';

export const EventHandlers = [
  MemberRemovedHandler,
  TableCreatedHandler,
  TableUpdatedHandler,
  TableDeletedHandler,
  CategoryDeletedHandler,
  ProductCreatedHandler,
  ProductDeletedHandler,
  ProductStockChangedHandler,
  OrderCreatedHandler,
  OrderUpdatedHandler,
  OrderCancelledHandler,
  OrderClosedHandler,
  OrderItemsAddedHandler,
  OrderTableMovedHandler,
  OrdersMergedHandler,
];
