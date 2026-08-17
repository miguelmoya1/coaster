import type { Order } from '@coaster/common';
import { asEstablishmentId, asTableId, SocketEvents, TableStatus } from '@coaster/common';
import { OrderTableMovedEvent } from '@coaster/orders';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { OrderTableMovedHandler } from './order-table-moved.handler';

describe('OrderTableMovedHandler', () => {
  let handler: OrderTableMovedHandler;
  const establishmentGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderTableMovedHandler, { provide: EstablishmentGateway, useValue: establishmentGateway }],
    }).compile();

    handler = module.get<OrderTableMovedHandler>(OrderTableMovedHandler);
  });

  it('should emit ORDER_UPDATED event, free the old table, and occupy the new table', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const order = { id: 'order-1' } as unknown as Order;
    const oldTableId = asTableId('table-1');
    const newTableId = asTableId('table-2');
    const event = new OrderTableMovedEvent(establishmentId, order, oldTableId, newTableId);

    handler.handle(event);

    expect(establishmentGateway.server.to).toHaveBeenCalledWith(establishmentId);
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.orderUpdated, order);
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.tableStatusChanged, {
      id: oldTableId,
      status: TableStatus.FREE,
    });
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.tableStatusChanged, {
      id: newTableId,
      status: TableStatus.OCCUPIED,
    });
  });

  it('should emit ORDER_UPDATED event and occupy the new table if there was no old table', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const order = { id: 'order-1' } as unknown as Order;
    const newTableId = asTableId('table-2');
    const event = new OrderTableMovedEvent(establishmentId, order, null, newTableId);

    handler.handle(event);

    expect(establishmentGateway.server.to).toHaveBeenCalledWith(establishmentId);
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.orderUpdated, order);
    expect(establishmentGateway.server.emit).not.toHaveBeenCalledWith(SocketEvents.tableStatusChanged, {
      id: vi.fn(),
      status: TableStatus.FREE,
    });
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.tableStatusChanged, {
      id: newTableId,
      status: TableStatus.OCCUPIED,
    });
  });
});
