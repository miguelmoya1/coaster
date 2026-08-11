import { asEstablishmentId, asOrderId, asOrderItemId, asProductId } from '@coaster/common';
import { TestBed } from '@angular/core/testing';
import type { Order, PrintTicketPayloadDto } from '@coaster/common';
import { OrderStatus, PaymentMethod } from '@coaster/common';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrinterRepository } from '../data-access/printer.repository';
import { PrintTicket } from './print-ticket';

describe('PrintTicket', () => {
  let service: PrintTicket;
  let printerRepositoryMock: {
    printTicket: ReturnType<typeof vi.fn>;
    getJob: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    printerRepositoryMock = {
      printTicket: vi.fn().mockResolvedValue({ jobId: 'job-1' }),
      getJob: vi.fn().mockResolvedValue({
        id: 'job-1',
        status: 'PRINTED',
        error: null,
        createdAt: '2026-08-07T10:00:00.000Z',
        completedAt: '2026-08-07T10:00:02.000Z',
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        PrintTicket,
        provideTranslateService(),
        { provide: PrinterRepository, useValue: printerRepositoryMock },
      ],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('es', { 'templates.products.coffee_black': 'Café solo' }, true);
    translate.use('es');
    service = TestBed.inject(PrintTicket);
  });

  const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
    id: asOrderId('order-1'),
    establishmentId: asEstablishmentId('establishment-100'),
    status: OrderStatus.OPEN,
    totalAmount: 2550,
    amountPaidCash: 0,
    amountPaidCard: 0,
    paymentMethod: PaymentMethod.NONE,
    tipAmount: 0,
    orderTotal: 2550,
    payableTotal: 2550,
    items: [
      {
        id: asOrderItemId('item-1'),
        orderId: asOrderId('order-1'),
        productId: asProductId('prod-1'),
        productName: 'Cerveza',
        quantity: 3,
        priceAtPurchase: 350,
        paidQuantity: 0,
        paidQuantityCash: 0,
        paidQuantityCard: 0,
        servedQuantity: 0,
        paymentStatus: 'PENDING' as any,
        deliveryStatus: 'PENDING' as any,
        paymentMethod: PaymentMethod.NONE,
      },
      {
        id: asOrderItemId('item-2'),
        orderId: asOrderId('order-1'),
        productId: asProductId('prod-2'),
        productName: 'Tapa de Jamón',
        quantity: 1,
        priceAtPurchase: 1500,
        paidQuantity: 0,
        paidQuantityCash: 0,
        paidQuantityCard: 0,
        servedQuantity: 0,
        paymentStatus: 'PENDING' as any,
        deliveryStatus: 'PENDING' as any,
        paymentMethod: PaymentMethod.NONE,
      },
    ],
    adjustments: [],
    ...overrides,
  });

  it('should call printerRepository.printTicket with the correct establishmentId', async () => {
    const order = createMockOrder();
    await service.execute(order);

    expect(printerRepositoryMock.printTicket).toHaveBeenCalledTimes(1);
    expect(printerRepositoryMock.printTicket).toHaveBeenCalledWith(
      asEstablishmentId('establishment-100'),
      expect.any(Object),
    );
  });

  it('should build a structured ticket payload with type "order"', async () => {
    const order = createMockOrder();
    await service.execute(order);

    const payload: PrintTicketPayloadDto = printerRepositoryMock.printTicket.mock.calls[0][1];
    expect(payload.type).toBe('order');
  });

  it('should format prices from cents to decimal strings', async () => {
    const order = createMockOrder();
    await service.execute(order);

    const payload: PrintTicketPayloadDto = printerRepositoryMock.printTicket.mock.calls[0][1];
    expect(payload.items?.[0].price).toBe('3.50');
    expect(payload.items?.[0].total).toBe('10.50');
    expect(payload.items?.[1].price).toBe('15.00');
    expect(payload.items?.[1].total).toBe('15.00');
    expect(payload.total).toBe('25.50');
  });

  it('should include item names from productName', async () => {
    const order = createMockOrder();
    await service.execute(order);

    const payload: PrintTicketPayloadDto = printerRepositoryMock.printTicket.mock.calls[0][1];
    expect(payload.items?.[0].name).toBe('Cerveza');
    expect(payload.items?.[1].name).toBe('Tapa de Jamón');
  });

  it('should print an imported product as the word, never as its translation key', async () => {
    const order = createMockOrder();
    order.items[0].productName = 'templates.products.coffee_black';

    await service.execute(order);

    const payload: PrintTicketPayloadDto = printerRepositoryMock.printTicket.mock.calls[0][1];
    expect(payload.items?.[0].name).toBe('Café solo');
  });

  it('should use tableName when available', async () => {
    const order = createMockOrder({ tableName: 'Mesa 5' });
    await service.execute(order);

    const payload: PrintTicketPayloadDto = printerRepositoryMock.printTicket.mock.calls[0][1];
    expect(payload.table).toBe('Mesa 5');
  });

  it('should default to "Barra" when no table is assigned', async () => {
    const order = createMockOrder({ tableId: undefined, tableName: undefined });
    await service.execute(order);

    const payload: PrintTicketPayloadDto = printerRepositoryMock.printTicket.mock.calls[0][1];
    expect(payload.table).toBe('Barra');
  });

  it('should set currency to EUR', async () => {
    const order = createMockOrder();
    await service.execute(order);

    const payload: PrintTicketPayloadDto = printerRepositoryMock.printTicket.mock.calls[0][1];
    expect(payload.currency).toBe('EUR');
  });

  it('should include notes when present', async () => {
    const order = createMockOrder({ notes: 'Sin hielo' });
    await service.execute(order);

    const payload: PrintTicketPayloadDto = printerRepositoryMock.printTicket.mock.calls[0][1];
    expect(payload.notes).toBe('Sin hielo');
  });

  it('should wait for the bridge to confirm the ticket printed', async () => {
    printerRepositoryMock.getJob
      .mockResolvedValueOnce({ id: 'job-1', status: 'PENDING', error: null, createdAt: '', completedAt: null })
      .mockResolvedValueOnce({ id: 'job-1', status: 'PRINTED', error: null, createdAt: '', completedAt: '' });

    await service.execute(createMockOrder());

    expect(printerRepositoryMock.getJob).toHaveBeenCalledTimes(2);
  });

  it('should reject when the bridge reports a failure', async () => {
    printerRepositoryMock.getJob.mockResolvedValue({
      id: 'job-1',
      status: 'FAILED',
      error: 'printer is out of paper',
      createdAt: '',
      completedAt: '',
    });

    await expect(service.execute(createMockOrder())).rejects.toThrow('printer is out of paper');
  });

  it('should pass the establishment name through to the ticket header', async () => {
    await service.execute(createMockOrder(), 'Establishment Central');

    const payload: PrintTicketPayloadDto = printerRepositoryMock.printTicket.mock.calls[0][1];
    expect(payload.establishmentName).toBe('Establishment Central');
  });
});
