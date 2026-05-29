import { AddOrderItemsHandler } from './add-order-items/add-order-items.handler';
import { BulkUpdateOrderHandler } from './bulk-update-order/bulk-update-order.handler';
import { CancelOrderHandler } from './cancel-order/cancel-order.handler';
import { CheckoutOrderHandler } from './checkout-order/checkout-order.handler';
import { CreateOrderHandler } from './create-order/create-order.handler';
import { DeleteOrderHandler } from './delete-order/delete-order.handler';
import { MergeOrdersHandler } from './merge-orders/merge-orders.handler';
import { MoveOrderTableHandler } from './move-order-table/move-order-table.handler';
import { RemoveOrderItemHandler } from './remove-order-item/remove-order-item.handler';

export { CreateOrderCommand } from './create-order/create-order.command';
export { AddOrderItemsCommand } from './add-order-items/add-order-items.command';
export { BulkUpdateOrderCommand } from './bulk-update-order/bulk-update-order.command';
export { CheckoutOrderCommand } from './checkout-order/checkout-order.command';
export { CancelOrderCommand } from './cancel-order/cancel-order.command';
export { MoveOrderTableCommand } from './move-order-table/move-order-table.command';
export { MergeOrdersCommand } from './merge-orders/merge-orders.command';
export { RemoveOrderItemCommand } from './remove-order-item/remove-order-item.command';
export { DeleteOrderCommand } from './delete-order/delete-order.command';

export const CommandHandlers = [
  CreateOrderHandler,
  AddOrderItemsHandler,
  BulkUpdateOrderHandler,
  CheckoutOrderHandler,
  CancelOrderHandler,
  MoveOrderTableHandler,
  MergeOrdersHandler,
  RemoveOrderItemHandler,
  DeleteOrderHandler,
];
