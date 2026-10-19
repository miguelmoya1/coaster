import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PaymentMethod } from '../models/payment-method.type';
import { asEstablishmentId } from '@coaster/core';
import { asOrderId, asOrderItemId } from '../models/order.interface';
import { asProductId } from '@coaster/products';
import { asTableId } from '@coaster/tables';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OrderRepository } from './order-repository';

describe('OrderRepository', () => {
  let service: OrderRepository;
  let httpMock: HttpTestingController;

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
      expect(service.routes.list(asEstablishmentId('1'))).toBe('/establishments/1/orders');
    });

    it('should have the create route', () => {
      expect(service.routes.create(asEstablishmentId('1'))).toBe('/establishments/1/orders');
    });

    it('should have the checkout route', () => {
      expect(service.routes.checkout(asEstablishmentId('1'), asOrderId('2'))).toBe(
        '/establishments/1/orders/2/checkout',
      );
    });

    it('should have the close route', () => {
      expect(service.routes.close(asEstablishmentId('1'), asOrderId('2'))).toBe('/establishments/1/orders/2/close');
    });

    it('should have the cancel route', () => {
      expect(service.routes.cancel(asEstablishmentId('1'), asOrderId('2'))).toBe('/establishments/1/orders/2/cancel');
    });

    it('should have the merge route', () => {
      expect(service.routes.merge(asEstablishmentId('1'))).toBe('/establishments/1/orders/merge');
    });
  });

  describe('create', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const dto = { items: [{ productId: asProductId('prod-1'), quantity: 2 }] };
    const rawOrder = {
      id: 'order-1',
      establishmentId: 'establishment-1',
      status: 'OPEN',
      totalAmount: 1000,
      amountPaidCash: 0,
      amountPaidCard: 0,
      items: [],
      adjustments: [],
      paymentMethod: 'NONE',
      tipAmount: 0,
      netTotal: 1000,
      taxBreakdown: [],
      taxAmountTotal: 0,
      orderTotal: 1000,
      payableTotal: 1000,
    };

    it('should call create endpoint and return mapped order', async () => {
      const promise = service.create(establishmentId, dto);
      const req = httpMock.expectOne(service.routes.create(establishmentId));
      expect(req.request.method).toBe('POST');
      req.flush(rawOrder);
      const res = await promise;
      expect(res.id).toBe('order-1');
      expect(res.orderTotal).toBe(1000);
    });
  });

  describe('checkout', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const orderId = asOrderId('order-1');

    it('should call checkout endpoint', async () => {
      const promise = service.checkout(establishmentId, orderId, { paymentMethod: PaymentMethod.CASH });
      const req = httpMock.expectOne(service.routes.checkout(establishmentId, orderId));
      expect(req.request.method).toBe('POST');
      req.flush(null);
      await promise;
    });
  });

  describe('close', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const orderId = asOrderId('order-1');

    it('should call close endpoint', async () => {
      const promise = service.close(establishmentId, orderId);
      const req = httpMock.expectOne(service.routes.close(establishmentId, orderId));
      expect(req.request.method).toBe('POST');
      req.flush(null);
      await promise;
    });
  });

  describe('cancel', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const orderId = asOrderId('order-1');

    it('should call cancel endpoint', async () => {
      const promise = service.cancel(establishmentId, orderId);
      const req = httpMock.expectOne(service.routes.cancel(establishmentId, orderId));
      expect(req.request.method).toBe('POST');
      req.flush(null);
      await promise;
    });
  });

  describe('bulkUpdate', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const orderId = asOrderId('order-1');
    const dto = { items: [{ itemId: asOrderItemId('item-1'), paidQuantity: 2, servedQuantity: 1 }] };

    it('should call bulkUpdate endpoint', async () => {
      const promise = service.bulkUpdate(establishmentId, orderId, dto);
      const req = httpMock.expectOne(service.routes.bulkUpdate(establishmentId, orderId));
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
      await promise;
    });
  });

  describe('moveTable', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const orderId = asOrderId('order-1');

    it('should call moveTable endpoint', async () => {
      const promise = service.moveTable(establishmentId, orderId, { tableId: asTableId('table-2') });
      const req = httpMock.expectOne(service.routes.moveTable(establishmentId, orderId));
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
      await promise;
    });
  });

  describe('merge', () => {
    const establishmentId = asEstablishmentId('establishment-1');

    it('should call merge endpoint', async () => {
      const promise = service.merge(establishmentId, { orderIds: [asOrderId('o1'), asOrderId('o2')] });
      const req = httpMock.expectOne(service.routes.merge(establishmentId));
      expect(req.request.method).toBe('POST');
      req.flush(null);
      await promise;
    });
  });
});
