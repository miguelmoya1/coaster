import { TestBed } from '@angular/core/testing';
import type { Order } from '@coaster/common';
import { asBarId, asOrderId, asOrderItemId, asProductId, asTableId } from '@coaster/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrinterRepository } from '../data-access/printer-repository';
import { PrintOrder } from './print-order';

describe('PrintOrder', () => {
  let service: PrintOrder;
  let printerRepositoryMock: {
    printText: ReturnType<typeof vi.fn>;
  };
  let toLocaleStringSpy: any;

  beforeEach(() => {
    printerRepositoryMock = {
      printText: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [PrintOrder, { provide: PrinterRepository, useValue: printerRepositoryMock }],
    });

    service = TestBed.inject(PrintOrder);
    toLocaleStringSpy = vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('7/13/2026, 7:43:40 PM');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should compile the ticket text correctly and print for a table order', async () => {
    const mockOrder = {
      id: asOrderId('order-1'),
      barId: asBarId('bar-100'),
      tableId: asTableId('table-12'),
      totalAmount: 29.5,
      items: [
        {
          id: asOrderItemId('item-1'),
          productId: asProductId('prod-1'),
          productName: 'Negroni',
          quantity: 2,
          priceAtPurchase: 8.5,
        },
        {
          id: asOrderItemId('item-2'),
          productId: asProductId('prod-2'),
          productName: 'Pizza',
          quantity: 1,
          priceAtPurchase: 12.5,
        },
      ],
    } as unknown as Order;

    await service.execute(mockOrder);

    expect(printerRepositoryMock.printText).toHaveBeenCalledTimes(1);

    const expectedText =
      `--------------------------------\n` +
      `          TABLE TICKET          \n` +
      `--------------------------------\n` +
      `Table: table-12\n` +
      `Date: 7/13/2026, 7:43:40 PM\n` +
      `--------------------------------\n` +
      `2x Negroni\n` +
      `    17.00 EUR\n` +
      `1x Pizza\n` +
      `    12.50 EUR\n` +
      `--------------------------------\n` +
      `TOTAL: 29.50 EUR\n` +
      `--------------------------------\n\n\n`;

    expect(printerRepositoryMock.printText).toHaveBeenCalledWith(asBarId('bar-100'), expectedText);
  });

  it('should compile the ticket text correctly and print for a bar order (no tableId)', async () => {
    const mockOrder = {
      id: asOrderId('order-2'),
      barId: asBarId('bar-100'),
      totalAmount: 8.5,
      items: [
        {
          id: asOrderItemId('item-1'),
          productId: asProductId('prod-1'),
          productName: 'Negroni',
          quantity: 1,
          priceAtPurchase: 8.5,
        },
      ],
    } as unknown as Order;

    await service.execute(mockOrder);

    expect(printerRepositoryMock.printText).toHaveBeenCalledTimes(1);

    const expectedText =
      `--------------------------------\n` +
      `          TABLE TICKET          \n` +
      `--------------------------------\n` +
      `Table: Bar\n` +
      `Date: 7/13/2026, 7:43:40 PM\n` +
      `--------------------------------\n` +
      `1x Negroni\n` +
      `    8.50 EUR\n` +
      `--------------------------------\n` +
      `TOTAL: 8.50 EUR\n` +
      `--------------------------------\n\n\n`;

    expect(printerRepositoryMock.printText).toHaveBeenCalledWith(asBarId('bar-100'), expectedText);
  });

  it('should fallback to productId if productName is not present', async () => {
    const mockOrder = {
      id: asOrderId('order-3'),
      barId: asBarId('bar-100'),
      tableId: asTableId('table-12'),
      totalAmount: 10.0,
      items: [
        {
          id: asOrderItemId('item-1'),
          productId: asProductId('prod-999'),
          quantity: 1,
          priceAtPurchase: 10.0,
        },
      ],
    } as unknown as Order;

    await service.execute(mockOrder);

    expect(printerRepositoryMock.printText).toHaveBeenCalledTimes(1);

    const expectedText =
      `--------------------------------\n` +
      `          TABLE TICKET          \n` +
      `--------------------------------\n` +
      `Table: table-12\n` +
      `Date: 7/13/2026, 7:43:40 PM\n` +
      `--------------------------------\n` +
      `1x prod-999\n` +
      `    10.00 EUR\n` +
      `--------------------------------\n` +
      `TOTAL: 10.00 EUR\n` +
      `--------------------------------\n\n\n`;

    expect(printerRepositoryMock.printText).toHaveBeenCalledWith(asBarId('bar-100'), expectedText);
  });
});
