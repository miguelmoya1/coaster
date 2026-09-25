import { DbOrderStatus, type DbCashCloseInclude, type DbOrderSelect } from '@coaster/core/db';

export const FINISHED_ORDER_STATUSES = [DbOrderStatus.CLOSED, DbOrderStatus.CANCELLED];

export const CASH_CLOSE_ORDER_FIELDS = {
  status: true,
  amountPaidCash: true,
  amountPaidCard: true,
  tipAmount: true,
  items: { select: { id: true, priceAtPurchase: true, quantity: true, paidQuantity: true, taxRateAtPurchase: true } },
  adjustments: { select: { id: true, target: true, type: true, value: true, itemId: true } },
} satisfies DbOrderSelect;

export const CASH_CLOSE_RELATIONS = {
  closedBy: { select: { name: true } },
} satisfies DbCashCloseInclude;
