import { asEstablishmentId, asOrderId, asOrderItemId, ErrorCodes, OrderStatus } from '@coaster/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderUpdatedEvent } from '../../events';
import { UpdateOrderItemNotesCommand } from '../impl/update-order-item-notes.command';
import { UpdateOrderItemNotesHandler } from './update-order-item-notes.handler';

const establishmentId = asEstablishmentId('establishment-1');
const orderId = asOrderId('order-1');
const itemId = asOrderItemId('item-1');

const openOrder = {
  id: 'order-1',
  establishmentId: 'establishment-1',
  status: OrderStatus.OPEN,
  items: [
    {
      id: 'item-1',
      orderId: 'order-1',
      productId: 'p1',
      quantity: 1,
      priceAtPurchase: 250,
      product: { name: 'Cerveza' },
      paymentStatus: 'PENDING',
      deliveryStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  adjustments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UpdateOrderItemNotesHandler', () => {
  let handler: UpdateOrderItemNotesHandler;

  const repository = {
    findById: vi.fn(),
    findOwnedById: vi.fn(),
    updateOrderItemNotes: vi.fn(),
  };
  const eventBus = { publish: vi.fn() };

  const run = (notes?: string, item = itemId) =>
    handler.execute(new UpdateOrderItemNotesCommand(establishmentId, orderId, item, { notes }));

  beforeEach(async () => {
    vi.clearAllMocks();
    repository.findOwnedById.mockResolvedValue(openOrder);
    repository.updateOrderItemNotes.mockResolvedValue(openOrder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOrderItemNotesHandler,
        { provide: OrdersWriteRepository, useValue: repository },
        { provide: OrdersReadRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get(UpdateOrderItemNotesHandler);
  });

  it('should save the note on its item and announce the order changed', async () => {
    await run('sin hielo');

    expect(repository.updateOrderItemNotes).toHaveBeenCalledWith(orderId, itemId, 'sin hielo');
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(OrderUpdatedEvent));
  });

  it('should clear a note that is blanked out', async () => {
    await run('   ');

    expect(repository.updateOrderItemNotes).toHaveBeenCalledWith(orderId, itemId, null);
  });

  it('should refuse an item that belongs to another order', async () => {
    await expect(run('sin hielo', asOrderItemId('item-9'))).rejects.toThrow(ErrorCodes.ORDER_ITEM_NOT_FOUND);
    expect(repository.updateOrderItemNotes).not.toHaveBeenCalled();
  });

  it('should look the order up scoped to its establishment, so another one cannot be reached', async () => {
    await run('sin hielo');

    expect(repository.findOwnedById).toHaveBeenCalledWith(openOrder.id, openOrder.establishmentId);
  });

  it('should refuse to touch a closed order', async () => {
    repository.findOwnedById.mockResolvedValue({ ...openOrder, status: OrderStatus.CLOSED });

    await expect(run('sin hielo')).rejects.toThrow(ErrorCodes.ORDER_NOT_OPEN);
    expect(repository.updateOrderItemNotes).not.toHaveBeenCalled();
  });
});
