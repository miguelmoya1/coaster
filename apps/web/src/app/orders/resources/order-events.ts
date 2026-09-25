import type { Order } from '@coaster/common';

export const withTip =
  (tipAmount: number) =>
  (order: Order): Order => ({
    ...order,
    tipAmount,
    payableTotal: (order.orderTotal ?? order.totalAmount) + tipAmount,
  });
