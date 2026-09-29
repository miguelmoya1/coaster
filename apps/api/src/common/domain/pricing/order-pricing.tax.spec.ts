import { describe, expect, it } from 'vitest';
import { AdjustmentTarget } from '../../constants/adjustment-target.type';
import { AdjustmentType } from '../../constants/adjustment-type.type';
import { OrderPricingEngine, PricingAdjustmentInput, PricingItemInput } from './order-pricing.engine';

const item = (over: Partial<PricingItemInput> & { id: string }): PricingItemInput => ({
  priceAtPurchase: 100,
  quantity: 1,
  paidQuantity: 0,
  taxRate: 1000,
  ...over,
});

const calculate = (items: PricingItemInput[], adjustments: PricingAdjustmentInput[] = [], tipAmount = 0) =>
  OrderPricingEngine.calculate({ items, adjustments, tipAmount, amountPaidCash: 0, amountPaidCard: 0 });

describe('VAT is added on top of the net price', () => {
  it('should charge the base plus its tax', () => {
    const result = calculate([item({ id: 'a', priceAtPurchase: 100, taxRate: 1000 })]);

    expect(result.netTotal).toBe(100);
    expect(result.taxAmountTotal).toBe(10);
    expect(result.orderTotal).toBe(110);
  });

  it('should multiply the net price by the quantity before taxing it', () => {
    const result = calculate([item({ id: 'a', priceAtPurchase: 200, quantity: 3, taxRate: 2100 })]);

    expect(result.netTotal).toBe(600);
    expect(result.taxAmountTotal).toBe(126);
    expect(result.orderTotal).toBe(726);
  });

  it('should always have the total equal base plus tax', () => {
    for (const net of [1, 7, 13, 99, 123, 217, 1499, 100003]) {
      const result = calculate([item({ id: 'a', priceAtPurchase: net, taxRate: 2100 })]);

      expect(result.taxBaseTotal + result.taxAmountTotal).toBe(result.orderTotal);
      expect(result.taxBaseTotal).toBe(result.netTotal);
    }
  });

  it('should hand each line its own gross, so a screen can show what the customer pays', () => {
    const result = calculate([item({ id: 'a', priceAtPurchase: 100, quantity: 2, taxRate: 2100 })]);

    expect(result.itemLines[0].finalTotal).toBe(200);
    expect(result.itemLines[0].grossTotal).toBe(242);
  });

  it('should keep one line per rate when a ticket mixes them', () => {
    const result = calculate([
      item({ id: 'food', priceAtPurchase: 1000, taxRate: 1000 }),
      item({ id: 'bottle', priceAtPurchase: 1000, taxRate: 2100 }),
    ]);

    expect(result.taxBreakdown).toEqual([
      { taxRate: 1000, taxBase: 1000, taxAmount: 100 },
      { taxRate: 2100, taxBase: 1000, taxAmount: 210 },
    ]);
    expect(result.orderTotal).toBe(2310);
  });

  it('should tax each rate on its summed base rather than line by line, so rounding cannot drift', () => {
    const manyLines = Array.from({ length: 7 }, (_, i) => item({ id: `i${i}`, priceAtPurchase: 33, taxRate: 2100 }));
    const result = calculate(manyLines);

    expect(result.netTotal).toBe(231);
    expect(result.taxAmountTotal).toBe(49);
    expect(result.orderTotal).toBe(280);
  });

  it('should leave the tip outside the base and outside the tax', () => {
    const withTip = calculate([item({ id: 'a', priceAtPurchase: 1000 })], [], 500);

    expect(withTip.netTotal).toBe(1000);
    expect(withTip.taxAmountTotal).toBe(100);
    expect(withTip.orderTotal).toBe(1100);
    expect(withTip.payableTotal).toBe(1600);
  });

  it('should discount the net and tax what is left, never the other way round', () => {
    const result = calculate(
      [item({ id: 'a', priceAtPurchase: 1000, taxRate: 1000 })],
      [{ id: 'd', target: AdjustmentTarget.ORDER, type: AdjustmentType.FIXED_AMOUNT, value: 200 }],
    );

    expect(result.netTotal).toBe(800);
    expect(result.taxAmountTotal).toBe(80);
    expect(result.orderTotal).toBe(880);
  });

  it('should spread an order discount across rates in proportion to their weight', () => {
    const result = calculate(
      [
        item({ id: 'food', priceAtPurchase: 1000, taxRate: 1000 }),
        item({ id: 'bottle', priceAtPurchase: 1000, taxRate: 2100 }),
      ],
      [{ id: 'd', target: AdjustmentTarget.ORDER, type: AdjustmentType.FIXED_AMOUNT, value: 200 }],
    );

    expect(result.taxBreakdown.map((line) => line.taxBase)).toEqual([900, 900]);
    expect(result.taxBaseTotal).toBe(result.netTotal);
  });

  it('should give the rounding cent to the heaviest rate rather than losing it', () => {
    const result = calculate(
      [
        item({ id: 'small', priceAtPurchase: 100, taxRate: 1000 }),
        item({ id: 'big', priceAtPurchase: 900, taxRate: 2100 }),
      ],
      [{ id: 'd', target: AdjustmentTarget.ORDER, type: AdjustmentType.FIXED_AMOUNT, value: 333 }],
    );

    expect(result.taxBaseTotal).toBe(result.netTotal);
    expect(result.taxBaseTotal + result.taxAmountTotal).toBe(result.orderTotal);
  });

  it('should give the same answer whatever the item ordering', () => {
    const items = [
      item({ id: 'a', priceAtPurchase: 733, taxRate: 1000 }),
      item({ id: 'b', priceAtPurchase: 733, taxRate: 2100 }),
      item({ id: 'c', priceAtPurchase: 411, taxRate: 1000 }),
    ];
    const discount: PricingAdjustmentInput[] = [
      { id: 'd', target: AdjustmentTarget.ORDER, type: AdjustmentType.PERCENTAGE, value: 17 },
    ];

    expect(calculate(items, discount).taxBreakdown).toEqual(calculate([...items].reverse(), discount).taxBreakdown);
  });

  it('should carry an item discount into its own rate, since the line has only one', () => {
    const result = calculate(
      [item({ id: 'a', priceAtPurchase: 1000, taxRate: 1000 })],
      [{ id: 'd', target: AdjustmentTarget.ITEM, itemId: 'a', type: AdjustmentType.FIXED_AMOUNT, value: 100 }],
    );

    expect(result.netTotal).toBe(900);
    expect(result.orderTotal).toBe(990);
  });

  it('should charge nothing at all for an empty or fully discounted order', () => {
    expect(calculate([]).orderTotal).toBe(0);
    expect(calculate([]).taxBreakdown).toEqual([]);

    const wipedOut = calculate(
      [item({ id: 'a', priceAtPurchase: 500 })],
      [{ id: 'd', target: AdjustmentTarget.ORDER, type: AdjustmentType.FIXED_AMOUNT, value: 500 }],
    );

    expect(wipedOut.netTotal).toBe(0);
    expect(wipedOut.orderTotal).toBe(0);
    expect(wipedOut.taxBreakdown).toEqual([]);
  });

  it('should charge the base alone when the rate is zero', () => {
    const result = calculate([item({ id: 'a', priceAtPurchase: 1000, taxRate: 0 })]);

    expect(result.orderTotal).toBe(1000);
    expect(result.taxBreakdown).toEqual([{ taxRate: 0, taxBase: 1000, taxAmount: 0 }]);
  });

  it('should settle a payment against the gross total, not the base', () => {
    const result = OrderPricingEngine.calculate({
      items: [item({ id: 'a', priceAtPurchase: 1000, taxRate: 1000 })],
      adjustments: [],
      tipAmount: 0,
      amountPaidCash: 1000,
      amountPaidCard: 0,
    });

    expect(result.pendingAmount).toBe(100);
    expect(result.isFullyPaid).toBe(false);
  });
});
