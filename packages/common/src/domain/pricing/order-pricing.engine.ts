import { AdjustmentTarget } from '../../constants/adjustment-target.type';
import { AdjustmentType } from '../../constants/adjustment-type.type';

export interface PricingItemInput {
  id: string;
  priceAtPurchase: number;
  quantity: number;
  paidQuantity: number;
}

export interface PricingAdjustmentInput {
  id: string;
  target: AdjustmentTarget;
  type: AdjustmentType;
  value: number;
  itemId?: string | null;
}

export interface PricingInput {
  items: PricingItemInput[];
  adjustments: PricingAdjustmentInput[];
  tipAmount: number;
  amountPaidCash: number;
  amountPaidCard: number;
}

export interface PricingItemOutput {
  id: string;
  baseTotal: number;
  discountsAmount: number;
  finalTotal: number;
  paidQuantity: number;
}

export interface PricingOutput {
  itemLines: PricingItemOutput[];
  itemsSubtotal: number;
  itemDiscountsTotal: number;
  orderDiscountsTotal: number;
  orderTotal: number;
  tipAmount: number;
  payableTotal: number;
  amountPaid: number;
  amountPaidCash: number;
  amountPaidCard: number;
  pendingAmount: number;
  isFullyPaid: boolean;
}

export class OrderPricingEngine {
  public static calculate(input: PricingInput): PricingOutput {
    const { items, adjustments, tipAmount, amountPaidCash, amountPaidCard } = input;

    let itemsSubtotal = 0;
    let itemDiscountsTotal = 0;
    const itemLines: PricingItemOutput[] = [];

    for (const item of items) {
      const baseTotal = item.quantity * item.priceAtPurchase;
      itemsSubtotal += baseTotal;

      let discountsAmount = 0;
      const itemAdjustments = adjustments.filter((a) => a.target === 'ITEM' && a.itemId === item.id);

      for (const adj of itemAdjustments) {
        if (adj.type === 'PERCENTAGE') {
          discountsAmount += Math.round((baseTotal * adj.value) / 100);
        } else if (adj.type === 'FIXED_AMOUNT') {
          discountsAmount += adj.value;
        }
      }

      discountsAmount = Math.min(discountsAmount, baseTotal);
      itemDiscountsTotal += discountsAmount;

      itemLines.push({
        id: item.id,
        baseTotal,
        discountsAmount,
        finalTotal: baseTotal - discountsAmount,
        paidQuantity: item.paidQuantity,
      });
    }

    let orderDiscountsTotal = 0;
    const orderAdjustments = adjustments.filter((a) => a.target === 'ORDER');
    const orderBaseForDiscount = itemsSubtotal - itemDiscountsTotal;

    for (const adj of orderAdjustments) {
      if (adj.type === 'PERCENTAGE') {
        orderDiscountsTotal += Math.round((itemsSubtotal * adj.value) / 100);
      } else if (adj.type === 'FIXED_AMOUNT') {
        orderDiscountsTotal += adj.value;
      }
    }

    orderDiscountsTotal = Math.min(orderDiscountsTotal, orderBaseForDiscount);

    const orderTotal = Math.max(0, itemsSubtotal - itemDiscountsTotal - orderDiscountsTotal);
    const payableTotal = orderTotal + tipAmount;
    const amountPaid = amountPaidCash + amountPaidCard;
    const pendingAmount = Math.max(0, payableTotal - amountPaid);
    const isFullyPaid = pendingAmount <= 0;

    return {
      itemLines,
      itemsSubtotal,
      itemDiscountsTotal,
      orderDiscountsTotal,
      orderTotal,
      tipAmount,
      payableTotal,
      amountPaid,
      amountPaidCash,
      amountPaidCard,
      pendingAmount,
      isFullyPaid,
    };
  }
}
