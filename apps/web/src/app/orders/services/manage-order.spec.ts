import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PaymentMethod, asEstablishmentId, asOrderId, asOrderItemId, asProductId, asTableId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderRepository } from '../data-access/order-repository';
import { ManageOrder } from './manage-order';

describe('ManageOrder', () => {
  let service: ManageOrder;

  const orderRepoMock = {
    addItems: vi.fn(),
    bulkUpdate: vi.fn(),
    checkout: vi.fn(),
    cancel: vi.fn(),
    moveTable: vi.fn(),
    merge: vi.fn(),
    removeItem: vi.fn(),
    getOrder: vi.fn(),
    create: vi.fn(),
  };

  const establishmentId = asEstablishmentId('establishment-1');
  const orderId = asOrderId('order-1');

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: OrderRepository, useValue: orderRepoMock }],
    });

    service = TestBed.inject(ManageOrder);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addItems', () => {
    it('should delegate to repository', async () => {
      const dto = { items: [{ productId: asProductId('prod-2'), quantity: 3 }] };
      orderRepoMock.addItems.mockResolvedValue(undefined);

      const result = await service.addItems(establishmentId, orderId, dto);

      expect(orderRepoMock.addItems).toHaveBeenCalledWith(establishmentId, orderId, dto);
      expect(result).toBeUndefined();
    });
  });

  describe('bulkUpdate', () => {
    it('should delegate to repository', async () => {
      const dto = { items: [{ itemId: asOrderItemId('item-1'), paidQuantity: 2, servedQuantity: 1 }] };
      orderRepoMock.bulkUpdate.mockResolvedValue(undefined);

      const result = await service.bulkUpdate(establishmentId, orderId, dto);

      expect(orderRepoMock.bulkUpdate).toHaveBeenCalledWith(establishmentId, orderId, dto);
      expect(result).toBeUndefined();
    });
  });

  describe('checkout', () => {
    it('should delegate to repository', async () => {
      orderRepoMock.checkout.mockResolvedValue(undefined);

      const result = await service.checkout(establishmentId, orderId, { paymentMethod: PaymentMethod.CASH });

      expect(orderRepoMock.checkout).toHaveBeenCalledWith(establishmentId, orderId, {
        paymentMethod: PaymentMethod.CASH,
      });
      expect(result).toBeUndefined();
    });
  });

  describe('cancel', () => {
    it('should delegate to repository', async () => {
      orderRepoMock.cancel.mockResolvedValue(undefined);

      const result = await service.cancel(establishmentId, orderId);

      expect(orderRepoMock.cancel).toHaveBeenCalledWith(establishmentId, orderId);
      expect(result).toBeUndefined();
    });
  });

  describe('moveTable', () => {
    it('should delegate to repository', async () => {
      const dto = { tableId: asTableId('table-2') };
      orderRepoMock.moveTable.mockResolvedValue(undefined);

      const result = await service.moveTable(establishmentId, orderId, dto);

      expect(orderRepoMock.moveTable).toHaveBeenCalledWith(establishmentId, orderId, dto);
      expect(result).toBeUndefined();
    });
  });

  describe('merge', () => {
    it('should delegate to repository', async () => {
      const dto = { orderIds: [asOrderId('o1'), asOrderId('o2')] };
      orderRepoMock.merge.mockResolvedValue(undefined);

      const result = await service.merge(establishmentId, dto);

      expect(orderRepoMock.merge).toHaveBeenCalledWith(establishmentId, dto);
      expect(result).toBeUndefined();
    });
  });
});
