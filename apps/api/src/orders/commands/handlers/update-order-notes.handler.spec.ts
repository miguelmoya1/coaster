import { asEstablishmentId, asOrderId, ErrorCodes, OrderStatus } from '@coaster/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderUpdatedEvent } from '../../events';
import { UpdateOrderNotesCommand } from '../impl/update-order-notes.command';
import { UpdateOrderNotesHandler } from './update-order-notes.handler';

const establishmentId = asEstablishmentId('establishment-1');
const orderId = asOrderId('order-1');

const openOrder = {
  id: 'order-1',
  establishmentId: 'establishment-1',
  status: OrderStatus.OPEN,
  items: [],
  adjustments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UpdateOrderNotesHandler', () => {
  let handler: UpdateOrderNotesHandler;

  const repository = {
    findById: vi.fn(),
    updateOrderNotes: vi.fn(),
  };
  const eventBus = { publish: vi.fn() };

  const run = (dto: { notes?: string; ticketNotes?: string }) =>
    handler.execute(new UpdateOrderNotesCommand(establishmentId, orderId, dto));

  beforeEach(async () => {
    vi.clearAllMocks();
    repository.findById.mockResolvedValue(openOrder);
    repository.updateOrderNotes.mockResolvedValue(openOrder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOrderNotesHandler,
        { provide: OrdersWriteRepository, useValue: repository },
        { provide: OrdersReadRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get(UpdateOrderNotesHandler);
  });

  it('should save the internal note and announce the order changed', async () => {
    await run({ notes: 'mesa exterior' });

    expect(repository.updateOrderNotes).toHaveBeenCalledWith(orderId, { notes: 'mesa exterior' });
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(OrderUpdatedEvent));
  });

  it('should save the ticket note on its own column', async () => {
    await run({ ticketNotes: 'para llevar' });

    expect(repository.updateOrderNotes).toHaveBeenCalledWith(orderId, { ticketNotes: 'para llevar' });
  });

  it('should leave the note it was not given untouched', async () => {
    await run({ notes: 'solo esta' });

    expect(repository.updateOrderNotes).toHaveBeenCalledWith(orderId, { notes: 'solo esta' });
  });

  it('should clear a note that is blanked out', async () => {
    await run({ notes: '   ' });

    expect(repository.updateOrderNotes).toHaveBeenCalledWith(orderId, { notes: null });
  });

  it('should refuse an order from another establishment', async () => {
    repository.findById.mockResolvedValue({ ...openOrder, establishmentId: 'establishment-2' });

    await expect(run({ notes: 'x' })).rejects.toThrow(ErrorCodes.ORDER_NOT_FOUND);
    expect(repository.updateOrderNotes).not.toHaveBeenCalled();
  });

  it('should refuse an order that does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(run({ notes: 'x' })).rejects.toThrow(ErrorCodes.ORDER_NOT_FOUND);
  });

  it('should refuse to touch a closed order', async () => {
    repository.findById.mockResolvedValue({ ...openOrder, status: OrderStatus.CLOSED });

    await expect(run({ notes: 'x' })).rejects.toThrow(ErrorCodes.ORDER_NOT_OPEN);
    expect(repository.updateOrderNotes).not.toHaveBeenCalled();
  });
});
