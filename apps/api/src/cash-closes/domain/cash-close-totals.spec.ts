import { OrderStatus } from '@coaster/common';
import { describe, expect, it } from 'vitest';
import type { CashCloseOrder } from './cash-close-totals';
import { cashCloseTotalsOf } from './cash-close-totals';

const beer = { id: 'item-1', priceAtPurchase: 1000, quantity: 2, paidQuantity: 0, taxRateAtPurchase: 1000 };

const order = (overrides: Partial<CashCloseOrder>): CashCloseOrder => ({
  status: OrderStatus.CLOSED,
  amountPaidCash: 0,
  amountPaidCard: 0,
  tipAmount: 0,
  items: [beer],
  adjustments: [],
  ...overrides,
});

describe('cashCloseTotalsOf', () => {
  it('should add up an empty close to nothing', () => {
    expect(cashCloseTotalsOf([])).toEqual({
      closedOrders: 0,
      cancelledOrders: 0,
      cancelledAmount: 0,
      cashAmount: 0,
      cardAmount: 0,
      tipAmount: 0,
    });
  });

  it('should split what was taken by how it was paid', () => {
    const totals = cashCloseTotalsOf([
      order({ amountPaidCash: 2200 }),
      order({ amountPaidCard: 2200 }),
      order({ amountPaidCash: 1000, amountPaidCard: 1200 }),
    ]);

    expect(totals.closedOrders).toBe(3);
    expect(totals.cashAmount).toBe(3200);
    expect(totals.cardAmount).toBe(3400);
  });

  it('should count tips from paid orders only', () => {
    const totals = cashCloseTotalsOf([
      order({ amountPaidCash: 2500, tipAmount: 300 }),
      order({ status: OrderStatus.CANCELLED, tipAmount: 500 }),
    ]);

    expect(totals.tipAmount).toBe(300);
  });

  it('should value a cancelled order at what the customer would have paid, tax and discounts included', () => {
    const totals = cashCloseTotalsOf([
      order({
        status: OrderStatus.CANCELLED,
        adjustments: [{ id: 'adj-1', target: 'ORDER', type: 'PERCENTAGE', value: 50, itemId: null }],
      }),
    ]);

    expect(totals.cancelledOrders).toBe(1);
    expect(totals.cancelledAmount).toBe(1100);
  });

  it('should not count as cancelled an order that was merged into another or emptied', () => {
    const totals = cashCloseTotalsOf([order({ status: OrderStatus.CANCELLED, items: [] })]);

    expect(totals.cancelledOrders).toBe(0);
    expect(totals.cancelledAmount).toBe(0);
  });

  it('should keep money charged on an order that was later cancelled, because it is in the drawer', () => {
    const totals = cashCloseTotalsOf([order({ status: OrderStatus.CANCELLED, amountPaidCash: 1100 })]);

    expect(totals.closedOrders).toBe(0);
    expect(totals.cashAmount).toBe(1100);
  });
});
