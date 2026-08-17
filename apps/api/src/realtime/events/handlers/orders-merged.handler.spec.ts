import type { Order } from '@coaster/common';
import { asEstablishmentId, asOrderId, asTableId, RealtimeEvents, TableStatus } from '@coaster/common';
import { OrdersMergedEvent } from '@coaster/orders';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { OrdersMergedHandler } from './orders-merged.handler';

describe('OrdersMergedHandler', () => {
  let handler: OrdersMergedHandler;
  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersMergedHandler, { provide: RealtimeService, useValue: realtime }],
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

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.orderUpdated, primaryOrder);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.orderCancelled, { id: 'order-s1' });
    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.tableStatusChanged, {
      id: 'table-1',
      status: TableStatus.FREE,
    });

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.orderCancelled, { id: 'order-s2' });
  });
});
