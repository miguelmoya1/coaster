import { AddOrderItemsHandler } from './handlers/add-order-items.handler';
import { BulkUpdateOrderHandler } from './handlers/bulk-update-order.handler';
import { UpdateOrderTipHandler } from './handlers/update-order-tip.handler';
import { AddOrderAdjustmentHandler } from './handlers/add-order-adjustment.handler';
import { RemoveOrderAdjustmentHandler } from './handlers/remove-order-adjustment.handler';
import { CancelOrderHandler } from './handlers/cancel-order.handler';
import { CheckoutOrderHandler } from './handlers/checkout-order.handler';
import { CreateOrderHandler } from './handlers/create-order.handler';
import { DeleteOrderHandler } from './handlers/delete-order.handler';
import { MergeOrdersHandler } from './handlers/merge-orders.handler';
import { MoveOrderTableHandler } from './handlers/move-order-table.handler';
import { RemoveOrderItemHandler } from './handlers/remove-order-item.handler';

export { AddOrderItemsCommand } from './impl/add-order-items.command';
export * from './impl/bulk-update-order.command';
export * from './impl/update-order-tip.command';
export * from './impl/add-order-adjustment.command';
export * from './impl/remove-order-adjustment.command';
export { CancelOrderCommand } from './impl/cancel-order.command';
export { CheckoutOrderCommand } from './impl/checkout-order.command';
export { CreateOrderCommand } from './impl/create-order.command';
export { DeleteOrderCommand } from './impl/delete-order.command';
export { MergeOrdersCommand } from './impl/merge-orders.command';
export { MoveOrderTableCommand } from './impl/move-order-table.command';
export { RemoveOrderItemCommand } from './impl/remove-order-item.command';

export const CommandHandlers = [
  AddOrderItemsHandler,
  BulkUpdateOrderHandler,
  UpdateOrderTipHandler,
  AddOrderAdjustmentHandler,
  RemoveOrderAdjustmentHandler,
  CancelOrderHandler,
  CheckoutOrderHandler,
  CreateOrderHandler,
  DeleteOrderHandler,
  MergeOrdersHandler,
  MoveOrderTableHandler,
  RemoveOrderItemHandler,
];
