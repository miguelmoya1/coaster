import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId, asOrderId, asOrderItemId, asProductId, asTableId } from '@coaster/core';
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

  const barId = asBarId('bar-1');
  const orderId = asOrderId('order-1');

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: OrderRepository, useValue: orderRepoMock },
      ],
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

      const result = await service.addItems(barId, orderId, dto);

      expect(orderRepoMock.addItems).toHaveBeenCalledWith(barId, orderId, dto);
      expect(result).toBeUndefined();
    });
  });

  describe('bulkUpdate', () => {
    it('should delegate to repository', async () => {
      const dto = { items: [{ itemId: asOrderItemId('item-1'), paidQuantity: 2, servedQuantity: 1 }] };
      orderRepoMock.bulkUpdate.mockResolvedValue(undefined);

      const result = await service.bulkUpdate(barId, orderId, dto);

      expect(orderRepoMock.bulkUpdate).toHaveBeenCalledWith(barId, orderId, dto);
      expect(result).toBeUndefined();
    });
  });

  describe('checkout', () => {
    it('should delegate to repository', async () => {
      orderRepoMock.checkout.mockResolvedValue(undefined);

      const result = await service.checkout(barId, orderId, { paymentMethod: 'CASH' });

      expect(orderRepoMock.checkout).toHaveBeenCalledWith(barId, orderId, { paymentMethod: 'CASH' });
      expect(result).toBeUndefined();
    });
  });

  describe('cancel', () => {
    it('should delegate to repository', async () => {
      orderRepoMock.cancel.mockResolvedValue(undefined);

      const result = await service.cancel(barId, orderId);

      expect(orderRepoMock.cancel).toHaveBeenCalledWith(barId, orderId);
      expect(result).toBeUndefined();
    });
  });

  describe('moveTable', () => {
    it('should delegate to repository', async () => {
      const dto = { tableId: asTableId('table-2') };
      orderRepoMock.moveTable.mockResolvedValue(undefined);

      const result = await service.moveTable(barId, orderId, dto);

      expect(orderRepoMock.moveTable).toHaveBeenCalledWith(barId, orderId, dto);
      expect(result).toBeUndefined();
    });
  });

  describe('merge', () => {
    it('should delegate to repository', async () => {
      const dto = { orderIds: [asOrderId('o1'), asOrderId('o2')] };
      orderRepoMock.merge.mockResolvedValue(undefined);

      const result = await service.merge(barId, dto);

      expect(orderRepoMock.merge).toHaveBeenCalledWith(barId, dto);
      expect(result).toBeUndefined();
    });
  });
});
