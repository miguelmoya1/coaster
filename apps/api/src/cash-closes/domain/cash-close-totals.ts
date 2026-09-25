import type { AdjustmentTarget, AdjustmentType, CashCloseTotals } from '@coaster/common';
import { OrderPricingEngine, OrderStatus } from '@coaster/common';

export interface CashCloseOrder {
  status: string;
  amountPaidCash: number;
  amountPaidCard: number;
  tipAmount: number;
  items: { id: string; priceAtPurchase: number; quantity: number; paidQuantity: number; taxRateAtPurchase: number }[];
  adjustments: { id: string; target: string; type: string; value: number; itemId: string | null }[];
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const orderTotalOf = (order: CashCloseOrder) =>
  OrderPricingEngine.calculate({
    items: order.items.map((item) => ({
      id: item.id,
      priceAtPurchase: item.priceAtPurchase,
      quantity: item.quantity,
      paidQuantity: item.paidQuantity,
      taxRate: item.taxRateAtPurchase,
    })),
    adjustments: order.adjustments.map((adjustment) => ({
      id: adjustment.id,
      target: adjustment.target as AdjustmentTarget,
      type: adjustment.type as AdjustmentType,
      value: adjustment.value,
      itemId: adjustment.itemId,
    })),
    tipAmount: 0,
    amountPaidCash: 0,
    amountPaidCard: 0,
  }).orderTotal;

export const cashCloseTotalsOf = (orders: CashCloseOrder[]): CashCloseTotals => {
  const closed = orders.filter((order) => order.status === OrderStatus.CLOSED);
  const cancelled = orders.filter((order) => order.status === OrderStatus.CANCELLED && order.items.length > 0);

  return {
    closedOrders: closed.length,
    cancelledOrders: cancelled.length,
    cancelledAmount: sum(cancelled.map(orderTotalOf)),
    cashAmount: sum(orders.map((order) => order.amountPaidCash)),
    cardAmount: sum(orders.map((order) => order.amountPaidCard)),
    tipAmount: sum(closed.map((order) => order.tipAmount)),
  };
};
