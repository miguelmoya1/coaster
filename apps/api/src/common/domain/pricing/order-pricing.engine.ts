import { AdjustmentTarget } from '../../constants/adjustment-target.type';
import { AdjustmentType } from '../../constants/adjustment-type.type';
import { grossFromNet, taxOf } from '../tax';

export interface PricingItemInput {
  id: string;
  priceAtPurchase: number;
  quantity: number;
  paidQuantity: number;
  taxRate: number;
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
  grossTotal: number;
  paidQuantity: number;
  taxRate: number;
}

export interface PricingTaxLine {
  taxRate: number;
  taxBase: number;
  taxAmount: number;
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
  netTotal: number;
  taxBreakdown: PricingTaxLine[];
  taxBaseTotal: number;
  taxAmountTotal: number;
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

      const finalTotal = baseTotal - discountsAmount;

      itemLines.push({
        id: item.id,
        baseTotal,
        discountsAmount,
        finalTotal,
        grossTotal: grossFromNet(finalTotal, item.taxRate),
        paidQuantity: item.paidQuantity,
        taxRate: item.taxRate,
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

    const netTotal = Math.max(0, itemsSubtotal - itemDiscountsTotal - orderDiscountsTotal);
    const netByRate = new Map<number, number>();

    for (const line of itemLines) {
      netByRate.set(line.taxRate, (netByRate.get(line.taxRate) ?? 0) + line.finalTotal);
    }

    const rates = [...netByRate.keys()].sort((a, b) => a - b);

    const shares = rates.map((rate) => {
      const net = netByRate.get(rate) ?? 0;
      const share = orderBaseForDiscount > 0 ? Math.round((orderDiscountsTotal * net) / orderBaseForDiscount) : 0;

      return { rate, net, share };
    });

    const distributed = shares.reduce((sum, entry) => sum + entry.share, 0);
    const heaviest = shares.reduce(
      (winner, entry) =>
        entry.net > winner.net || (entry.net === winner.net && entry.rate > winner.rate) ? entry : winner,
      shares[0] ?? { rate: 0, net: 0, share: 0 },
    );
    heaviest.share += orderDiscountsTotal - distributed;

    const taxBreakdown: PricingTaxLine[] = shares
      .map(({ rate, net, share }) => {
        const taxBase = Math.max(0, net - share);

        return { taxRate: rate, taxBase, taxAmount: taxOf(taxBase, rate) };
      })
      .filter((line) => line.taxBase > 0);

    const taxBaseTotal = taxBreakdown.reduce((sum, line) => sum + line.taxBase, 0);
    const taxAmountTotal = taxBreakdown.reduce((sum, line) => sum + line.taxAmount, 0);

    const orderTotal = taxBaseTotal + taxAmountTotal;
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
      netTotal,
      taxBreakdown,
      taxBaseTotal,
      taxAmountTotal,
    };
  }
}
