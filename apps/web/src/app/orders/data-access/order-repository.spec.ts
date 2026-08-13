import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PaymentMethod, asEstablishmentId, asOrderId, asOrderItemId, asProductId, asTableId } from '@coaster/common';
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

    it('should call create endpoint', async () => {
      const promise = service.create(establishmentId, dto);
      const req = httpMock.expectOne(service.routes.create(establishmentId));
      expect(req.request.method).toBe('POST');
      req.flush(null);
      await promise;
    });

    it('should return null', async () => {
      const res = service.create(establishmentId, dto);
      httpMock.expectOne(service.routes.create(establishmentId)).flush(null);
      expect(await res).toBeNull();
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
