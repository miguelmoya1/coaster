import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
import { OrderRepository } from './order-repository';

describe('OrderRepository', () => {
  let service: OrderRepository;
  let httpMock: HttpTestingController;

  const mockOrder: Order = {
    id: asOrderId('order-1'),
    barId: asBarId('bar-1'),
    status: OrderStatus.OPEN,
    totalAmount: 1500,
    items: [
      {
        id: asOrderItemId('item-1'),
        orderId: asOrderId('order-1'),
        productId: asProductId('prod-1'),
        quantity: 2,
        priceAtPurchase: 500,
        paymentStatus: PaymentStatus.PENDING,
        deliveryStatus: DeliveryStatus.PENDING,
        paidQuantity: 0,
        servedQuantity: 0,
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    service = TestBed.inject(OrderRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('routes', () => {
    it('should have the list route', () => {
      expect(service.routes.list(asBarId('1'))).toBe('/bars/1/orders');
    });

    it('should have the create route', () => {
      expect(service.routes.create(asBarId('1'))).toBe('/bars/1/orders');
    });

    it('should have the checkout route', () => {
      expect(service.routes.checkout(asBarId('1'), asOrderId('2'))).toBe('/bars/1/orders/2/checkout');
    });

    it('should have the cancel route', () => {
      expect(service.routes.cancel(asBarId('1'), asOrderId('2'))).toBe('/bars/1/orders/2/cancel');
    });

    it('should have the merge route', () => {
      expect(service.routes.merge(asBarId('1'))).toBe('/bars/1/orders/merge');
    });
  });

  describe('create', () => {
    const barId = asBarId('bar-1');
    const dto = { items: [{ productId: 'prod-1', quantity: 2 }] };

    it('should call create endpoint', async () => {
      const promise = service.create(barId, dto);
      const req = httpMock.expectOne(service.routes.create(barId));
      expect(req.request.method).toBe('POST');
      req.flush(mockOrder);
      await promise;
    });

    it('should return mapped order', async () => {
      const res = service.create(barId, dto);
      httpMock.expectOne(service.routes.create(barId)).flush(mockOrder);
      expect(await res).toEqual(mockOrder);
    });
  });

  describe('checkout', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');

    it('should call checkout endpoint', async () => {
      const closedOrder = { ...mockOrder, status: OrderStatus.CLOSED };
      const promise = service.checkout(barId, orderId);
      const req = httpMock.expectOne(service.routes.checkout(barId, orderId));
      expect(req.request.method).toBe('POST');
      req.flush(closedOrder);
      await promise;
    });
  });

  describe('cancel', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');

    it('should call cancel endpoint', async () => {
      const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };
      const promise = service.cancel(barId, orderId);
      const req = httpMock.expectOne(service.routes.cancel(barId, orderId));
      expect(req.request.method).toBe('POST');
      req.flush(cancelledOrder);
      await promise;
    });
  });

  describe('bulkPay', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');
    const dto = { items: [{ itemId: 'item-1', paidQuantity: 2 }] };

    it('should call bulkPay endpoint', async () => {
      const promise = service.bulkPay(barId, orderId, dto);
      const req = httpMock.expectOne(service.routes.bulkPay(barId, orderId));
      expect(req.request.method).toBe('PATCH');
      req.flush(mockOrder);
      await promise;
    });
  });

  describe('bulkServe', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');
    const dto = { items: [{ itemId: 'item-1', servedQuantity: 2 }] };

    it('should call bulkServe endpoint', async () => {
      const promise = service.bulkServe(barId, orderId, dto);
      const req = httpMock.expectOne(service.routes.bulkServe(barId, orderId));
      expect(req.request.method).toBe('PATCH');
      req.flush(mockOrder);
      await promise;
    });
  });

  describe('moveTable', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');

    it('should call moveTable endpoint', async () => {
      const promise = service.moveTable(barId, orderId, { tableId: 'table-2' });
      const req = httpMock.expectOne(service.routes.moveTable(barId, orderId));
      expect(req.request.method).toBe('PATCH');
      req.flush(mockOrder);
      await promise;
    });
  });

  describe('merge', () => {
    const barId = asBarId('bar-1');

    it('should call merge endpoint', async () => {
      const promise = service.merge(barId, { orderIds: ['o1', 'o2'] });
      const req = httpMock.expectOne(service.routes.merge(barId));
      expect(req.request.method).toBe('POST');
      req.flush(mockOrder);
      await promise;
    });
  });
});
