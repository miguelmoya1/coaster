import { TestBed } from '@angular/core/testing';
import {
  asBarId,
  asOrderId,
  asOrderItemId,
  asProductId,
  DeliveryStatus,
  Order,
  OrderStatus,
  PaymentStatus,
} from '@coaster/common';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { OrderRepository } from '../data-access/order-repository';
import { CreateOrder } from './create-order';

describe('CreateOrder', () => {
  let service: CreateOrder;
  let orderRepoMock: Record<string, Mock>;

  const mockOrder: Order = {
    id: asOrderId('order-1'),
    barId: asBarId('bar-1'),
    status: OrderStatus.OPEN,
    totalAmount: 1000,
    items: [
      {
        id: asOrderItemId('item-1'),
        orderId: asOrderId('order-1'),
        productId: asProductId('prod-1'),
        quantity: 1,
        priceAtPurchase: 1000,
        paymentStatus: PaymentStatus.PENDING,
        deliveryStatus: DeliveryStatus.PENDING,
      },
    ],
  };

  beforeEach(() => {
    orderRepoMock = {
      create: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: OrderRepository, useValue: orderRepoMock }],
    });

    service = TestBed.inject(CreateOrder);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should delegate to repository and return the result', async () => {
      const barId = asBarId('bar-1');
      const dto = { items: [{ productId: 'prod-1', quantity: 1 }] };
      orderRepoMock['create'].mockResolvedValue(mockOrder);

      const result = await service.execute(barId, dto);

      expect(orderRepoMock['create']).toHaveBeenCalledWith(barId, dto);
      expect(result).toEqual(mockOrder);
    });
  });
});
