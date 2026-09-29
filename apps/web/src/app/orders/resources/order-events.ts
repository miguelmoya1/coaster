import type { Order } from '../models/order.interface';

export const withTip =
  (tipAmount: number) =>
  (order: Order): Order => ({
    ...order,
    tipAmount,
    payableTotal: (order.orderTotal ?? order.totalAmount) + tipAmount,
  });
