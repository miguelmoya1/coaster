import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, asOrderId, asOrderItemId, asProductId, asTableId } from '@coaster/core';
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
    const dto = { items: [{ productId: asProductId('prod-1'), quantity: 2 }] };

    it('should call create endpoint', async () => {
      const promise = service.create(barId, dto);
      const req = httpMock.expectOne(service.routes.create(barId));
      expect(req.request.method).toBe('POST');
      req.flush(null);
      await promise;
    });

    it('should return null', async () => {
      const res = service.create(barId, dto);
      httpMock.expectOne(service.routes.create(barId)).flush(null);
      expect(await res).toBeNull();
    });
  });

  describe('checkout', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');

    it('should call checkout endpoint', async () => {
      const promise = service.checkout(barId, orderId);
      const req = httpMock.expectOne(service.routes.checkout(barId, orderId));
      expect(req.request.method).toBe('POST');
      req.flush(null);
      await promise;
    });
  });

  describe('cancel', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');

    it('should call cancel endpoint', async () => {
      const promise = service.cancel(barId, orderId);
      const req = httpMock.expectOne(service.routes.cancel(barId, orderId));
      expect(req.request.method).toBe('POST');
      req.flush(null);
      await promise;
    });
  });

  describe('bulkUpdate', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');
    const dto = { items: [{ itemId: asOrderItemId('item-1'), paidQuantity: 2, servedQuantity: 1 }] };

    it('should call bulkUpdate endpoint', async () => {
      const promise = service.bulkUpdate(barId, orderId, dto);
      const req = httpMock.expectOne(service.routes.bulkUpdate(barId, orderId));
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
      await promise;
    });
  });

  describe('moveTable', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');

    it('should call moveTable endpoint', async () => {
      const promise = service.moveTable(barId, orderId, { tableId: asTableId('table-2') });
      const req = httpMock.expectOne(service.routes.moveTable(barId, orderId));
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
      await promise;
    });
  });

  describe('merge', () => {
    const barId = asBarId('bar-1');

    it('should call merge endpoint', async () => {
      const promise = service.merge(barId, { orderIds: [asOrderId('o1'), asOrderId('o2')] });
      const req = httpMock.expectOne(service.routes.merge(barId));
      expect(req.request.method).toBe('POST');
      req.flush(null);
      await promise;
    });
  });
});
