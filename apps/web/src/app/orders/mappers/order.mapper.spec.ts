import { describe, expect, it } from 'vitest';
import type { Order } from '@coaster/common';
import { asBarId, asOrderId, asOrderItemId, asProductId, DeliveryStatus, OrderStatus, PaymentStatus } from '@coaster/core';
import { checkIsOrder, orderArrayMapper, orderMapper } from './order.mapper';

describe('Order Mapper', () => {
  const validOrder: Order = {
    id: asOrderId('order-1'),
    barId: asBarId('bar-1'),
    status: OrderStatus.OPEN,
    totalAmount: 1500,
    items: [
      {
        id: asOrderItemId('item-1'),
        orderId: asOrderId('order-1'),
        productId: asProductId('prod-1'),
        productName: 'Beer',
        quantity: 2,
        priceAtPurchase: 500,
        paymentStatus: PaymentStatus.PENDING,
        deliveryStatus: DeliveryStatus.PENDING,
        paidQuantity: 0,
        servedQuantity: 0,
      },
    ],
  };

  describe('checkIsOrder', () => {
    it('should return true for valid order', () => {
      expect(checkIsOrder(validOrder)).toBe(true);
    });

    it('should return false for null', () => {
      expect(checkIsOrder(null)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(checkIsOrder({})).toBe(false);
    });

    it('should return false for object missing items array', () => {
      expect(checkIsOrder({ ...validOrder, items: 'not-array' })).toBe(false);
    });

    it('should return false for order with invalid items', () => {
      expect(checkIsOrder({ ...validOrder, items: [{ invalid: true }] })).toBe(false);
    });
  });

  describe('orderMapper', () => {
    it('should map a valid order', () => {
      expect(orderMapper(validOrder)).toEqual(validOrder);
    });

    it('should throw Error for invalid order', () => {
      expect(() => orderMapper({})).toThrow('Invalid Order payload');
    });
  });

  describe('orderArrayMapper', () => {
    it('should map valid array of orders', () => {
      expect(orderArrayMapper([validOrder])).toEqual([validOrder]);
    });

    it('should return empty array for empty input', () => {
      expect(orderArrayMapper([])).toEqual([]);
    });

    it('should throw Error if input is not an array', () => {
      expect(() => orderArrayMapper({})).toThrow('Expected array of Orders');
    });
  });
});
