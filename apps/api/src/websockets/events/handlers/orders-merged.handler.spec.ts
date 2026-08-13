import type { Order } from '@coaster/common';
import { asEstablishmentId, asOrderId, asTableId, SocketEvents, TableStatus } from '@coaster/common';
import { OrdersMergedEvent } from '@coaster/orders';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { OrdersMergedHandler } from './orders-merged.handler';

describe('OrdersMergedHandler', () => {
  let handler: OrdersMergedHandler;
  const establishmentGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersMergedHandler, { provide: EstablishmentGateway, useValue: establishmentGateway }],
    }).compile();

    handler = module.get<OrdersMergedHandler>(OrdersMergedHandler);
  });

  it('should emit ORDER_UPDATED for primary order, cancel source orders and free their tables', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const primaryOrder = { id: 'order-primary' } as unknown as Order;
    const sourceOrders = [
      { id: asOrderId('order-s1'), tableId: asTableId('table-1') },
      { id: asOrderId('order-s2'), tableId: null },
    ];
    const event = new OrdersMergedEvent(establishmentId, primaryOrder, sourceOrders);

    handler.handle(event);

    expect(establishmentGateway.server.to).toHaveBeenCalledWith(establishmentId);
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.orderUpdated, primaryOrder);

    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.orderCancelled, { id: 'order-s1' });
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.tableStatusChanged, {
      id: 'table-1',
      status: TableStatus.FREE,
    });

    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.orderCancelled, { id: 'order-s2' });
  });
});
