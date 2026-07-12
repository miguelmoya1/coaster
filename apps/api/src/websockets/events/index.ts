import { CategoryCreatedHandler } from './handlers/category-created.handler';
import { CategoryDeletedHandler } from './handlers/category-deleted.handler';
import { CategoryUpdatedHandler } from './handlers/category-updated.handler';
import { MemberInvitedHandler } from './handlers/member-invited.handler';
import { MemberRemovedHandler } from './handlers/member-removed.handler';
import { OrderCancelledHandler } from './handlers/order-cancelled.handler';
import { OrderClosedHandler } from './handlers/order-closed.handler';
import { OrderCreatedHandler } from './handlers/order-created.handler';
import { OrderDeletedHandler } from './handlers/order-deleted.handler';
import { OrderItemsAddedHandler } from './handlers/order-items-added.handler';
import { OrderTableMovedHandler } from './handlers/order-table-moved.handler';
import { OrderUpdatedHandler } from './handlers/order-updated.handler';
import { OrdersMergedHandler } from './handlers/orders-merged.handler';
import { OrderTipUpdatedHandler } from './handlers/order-tip-updated.handler';
import { OrderAdjustmentsUpdatedHandler } from './handlers/order-adjustments-updated.handler';
import { ProductCreatedHandler } from './handlers/product-created.handler';
import { ProductDeletedHandler } from './handlers/product-deleted.handler';
import { ProductStockChangedHandler } from './handlers/product-stock-changed.handler';
import { ProductUpdatedHandler } from './handlers/product-updated.handler';
import { ShiftCreatedHandler } from './handlers/shift-created.handler';
import { ShiftDeletedHandler } from './handlers/shift-deleted.handler';
import { TableCreatedHandler } from './handlers/table-created.handler';
import { TableDeletedHandler } from './handlers/table-deleted.handler';
import { TableUpdatedHandler } from './handlers/table-updated.handler';

export * from './handlers/category-created.handler';
export * from './handlers/category-deleted.handler';
export * from './handlers/category-updated.handler';
export * from './handlers/member-invited.handler';
export * from './handlers/member-removed.handler';
export * from './handlers/order-cancelled.handler';
export * from './handlers/order-closed.handler';
export * from './handlers/order-created.handler';
export * from './handlers/order-deleted.handler';
export * from './handlers/order-items-added.handler';
export * from './handlers/order-table-moved.handler';
export * from './handlers/order-updated.handler';
export * from './handlers/orders-merged.handler';
export * from './handlers/order-tip-updated.handler';
export * from './handlers/order-adjustments-updated.handler';
export * from './handlers/product-created.handler';
export * from './handlers/product-deleted.handler';
export * from './handlers/product-stock-changed.handler';
export * from './handlers/product-updated.handler';
export * from './handlers/shift-created.handler';
export * from './handlers/shift-deleted.handler';
export * from './handlers/table-created.handler';
export * from './handlers/table-deleted.handler';
export * from './handlers/table-updated.handler';

export const WsEventHandlers = [
  CategoryCreatedHandler,
  CategoryDeletedHandler,
  CategoryUpdatedHandler,
  MemberInvitedHandler,
  MemberRemovedHandler,
  OrderCancelledHandler,
  OrderClosedHandler,
  OrderCreatedHandler,
  OrderDeletedHandler,
  OrderItemsAddedHandler,
  OrderTableMovedHandler,
  OrderUpdatedHandler,
  OrdersMergedHandler,
  OrderTipUpdatedHandler,
  OrderAdjustmentsUpdatedHandler,
  ProductCreatedHandler,
  ProductDeletedHandler,
  ProductStockChangedHandler,
  ProductUpdatedHandler,
  ShiftCreatedHandler,
  ShiftDeletedHandler,
  TableCreatedHandler,
  TableDeletedHandler,
  TableUpdatedHandler,
];
