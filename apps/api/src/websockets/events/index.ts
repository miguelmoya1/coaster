import { MemberInvitedHandler } from './impl/bar-members/member-invited.handler';
import { MemberRemovedHandler } from './impl/bar-members/member-removed.handler';
import { TableCreatedHandler } from './impl/tables/table-created.handler';
import { TableUpdatedHandler } from './impl/tables/table-updated.handler';
import { TableDeletedHandler } from './impl/tables/table-deleted.handler';
import { CategoryCreatedHandler } from './impl/categories/category-created.handler';
import { CategoryUpdatedHandler } from './impl/categories/category-updated.handler';
import { CategoryDeletedHandler } from './impl/categories/category-deleted.handler';
import { ProductCreatedHandler } from './impl/products/product-created.handler';
import { ProductUpdatedHandler } from './impl/products/product-updated.handler';
import { ProductDeletedHandler } from './impl/products/product-deleted.handler';
import { ProductStockChangedHandler } from './impl/products/product-stock-changed.handler';
import { OrderCreatedHandler } from './impl/orders/order-created.handler';
import { OrderUpdatedHandler } from './impl/orders/order-updated.handler';
import { OrderCancelledHandler } from './impl/orders/order-cancelled.handler';
import { OrderClosedHandler } from './impl/orders/order-closed.handler';
import { OrderDeletedHandler } from './impl/orders/order-deleted.handler';
import { OrderItemsAddedHandler } from './impl/orders/order-items-added.handler';
import { OrderTableMovedHandler } from './impl/orders/order-table-moved.handler';
import { OrdersMergedHandler } from './impl/orders/orders-merged.handler';
import { ShiftCreatedHandler } from './impl/shifts/shift-created.handler';
import { ShiftDeletedHandler } from './impl/shifts/shift-deleted.handler';

export * from './impl/bar-members/member-invited.handler';
export * from './impl/bar-members/member-removed.handler';
export * from './impl/tables/table-created.handler';
export * from './impl/tables/table-updated.handler';
export * from './impl/tables/table-deleted.handler';
export * from './impl/categories/category-created.handler';
export * from './impl/categories/category-updated.handler';
export * from './impl/categories/category-deleted.handler';
export * from './impl/products/product-created.handler';
export * from './impl/products/product-updated.handler';
export * from './impl/products/product-deleted.handler';
export * from './impl/products/product-stock-changed.handler';
export * from './impl/orders/order-created.handler';
export * from './impl/orders/order-updated.handler';
export * from './impl/orders/order-cancelled.handler';
export * from './impl/orders/order-closed.handler';
export * from './impl/orders/order-deleted.handler';
export * from './impl/orders/order-items-added.handler';
export * from './impl/orders/order-table-moved.handler';
export * from './impl/orders/orders-merged.handler';
export * from './impl/shifts/shift-created.handler';
export * from './impl/shifts/shift-deleted.handler';

export const EventHandlers = [
  MemberInvitedHandler,
  MemberRemovedHandler,
  TableCreatedHandler,
  TableUpdatedHandler,
  TableDeletedHandler,
  CategoryCreatedHandler,
  CategoryUpdatedHandler,
  CategoryDeletedHandler,
  ProductCreatedHandler,
  ProductUpdatedHandler,
  ProductDeletedHandler,
  ProductStockChangedHandler,
  OrderCreatedHandler,
  OrderUpdatedHandler,
  OrderCancelledHandler,
  OrderClosedHandler,
  OrderDeletedHandler,
  OrderItemsAddedHandler,
  OrderTableMovedHandler,
  OrdersMergedHandler,
  ShiftCreatedHandler,
  ShiftDeletedHandler,
];
