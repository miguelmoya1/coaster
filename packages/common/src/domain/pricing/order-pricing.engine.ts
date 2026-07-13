import { AdjustmentTarget } from '../../constants/adjustment-target.type';
import { AdjustmentType } from '../../constants/adjustment-type.type';

// Input types
export interface PricingItemInput {
  id: string;
  priceAtPurchase: number; // in cents
  quantity: number;
  paidQuantity: number;
  // Prepared for taxes
  taxRate?: number; // e.g., 21 for 21%
}

export interface PricingAdjustmentInput {
  id: string;
  target: AdjustmentTarget; // 'ORDER' | 'ITEM'
  type: AdjustmentType; // 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number; // in cents if fixed, or percentage points (e.g. 10 for 10%)
  itemId?: string | null;
}

export interface PricingInput {
  items: PricingItemInput[];
  adjustments: PricingAdjustmentInput[];
  tipAmount: number;
  amountPaidCash: number;
  amountPaidCard: number;
}

// Output types
export interface PricingItemOutput {
  id: string;
  baseTotal: number; // quantity * priceAtPurchase
  discountsAmount: number; // value subtracted by item-level adjustments
  finalTotal: number; // baseTotal - discountsAmount
  paidQuantity: number;
  // Prepared for taxes
  taxRate?: number;
  taxAmount?: number;
}

export interface PricingOutput {
  itemLines: PricingItemOutput[];
  itemsSubtotal: number; // sum(baseTotal)
  itemDiscountsTotal: number; // sum(discountsAmount)
  orderDiscountsTotal: number; // total amount subtracted by order-level adjustments
  orderTotal: number; // itemsSubtotal - itemDiscountsTotal - orderDiscountsTotal
  tipAmount: number;
  payableTotal: number; // orderTotal + tipAmount
  amountPaid: number; // cash + card
  amountPaidCash: number;
  amountPaidCard: number;
  pendingAmount: number; // max(0, payableTotal - amountPaid)
  isFullyPaid: boolean;

  // Prepared for taxes
  taxBaseTotal?: number;
  taxTotal?: number;
}

export class OrderPricingEngine {
  public static calculate(input: PricingInput): PricingOutput {
    const { items, adjustments, tipAmount, amountPaidCash, amountPaidCard } = input;

    let itemsSubtotal = 0;
    let itemDiscountsTotal = 0;
    const itemLines: PricingItemOutput[] = [];

    // 1. Calculate per-item totals and item-level discounts
    for (const item of items) {
      const baseTotal = item.quantity * item.priceAtPurchase;
      itemsSubtotal += baseTotal;

      let discountsAmount = 0;
      // Find adjustments targeting this item
      const itemAdjustments = adjustments.filter((a) => a.target === 'ITEM' && a.itemId === item.id);

      for (const adj of itemAdjustments) {
        if (adj.type === 'PERCENTAGE') {
          discountsAmount += Math.round((baseTotal * adj.value) / 100);
        } else if (adj.type === 'FIXED_AMOUNT') {
          discountsAmount += adj.value;
        }
      }

      // Ensure discount doesn't exceed baseTotal
      discountsAmount = Math.min(discountsAmount, baseTotal);
      itemDiscountsTotal += discountsAmount;

      itemLines.push({
        id: item.id,
        baseTotal,
        discountsAmount,
        finalTotal: baseTotal - discountsAmount,
        paidQuantity: item.paidQuantity,
        taxRate: item.taxRate,
      });
    }

    // 2. Calculate order-level discounts
    let orderDiscountsTotal = 0;
    const orderAdjustments = adjustments.filter((a) => a.target === 'ORDER');
    const orderBaseForDiscount = itemsSubtotal - itemDiscountsTotal;

    for (const adj of orderAdjustments) {
      if (adj.type === 'PERCENTAGE') {
        // According to previous logic, global percentage is calculated over the raw total amount (itemsSubtotal)
        orderDiscountsTotal += Math.round((itemsSubtotal * adj.value) / 100);
      } else if (adj.type === 'FIXED_AMOUNT') {
        orderDiscountsTotal += adj.value;
      }
    }

    // Ensure order discounts don't exceed the available amount
    orderDiscountsTotal = Math.min(orderDiscountsTotal, orderBaseForDiscount);

    // 3. Final sums
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
