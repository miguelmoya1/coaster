import type { Order } from '@coaster/common';
import { asEstablishmentId, asTableId, RealtimeEvents, TableStatus } from '@coaster/common';
import { OrderCancelledEvent } from '@coaster/orders';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { OrderCancelledHandler } from './order-cancelled.handler';

describe('OrderCancelledHandler', () => {
  let handler: OrderCancelledHandler;
  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderCancelledHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<OrderCancelledHandler>(OrderCancelledHandler);
  });

  it('should emit ORDER_CANCELLED event and set table status to FREE if table exists', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const order = { id: 'order-1' } as unknown as Order;
    const tableId = asTableId('table-1');
    const event = new OrderCancelledEvent(establishmentId, order, tableId);

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.orderCancelled, order);
    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.tableStatusChanged, {
      id: tableId,
      status: TableStatus.FREE,
    });
  });

  it('should only emit ORDER_CANCELLED event if no table exists', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const order = { id: 'order-1' } as unknown as Order;
    const event = new OrderCancelledEvent(establishmentId, order, null);

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.orderCancelled, order);
    expect(realtime.publish).not.toHaveBeenCalledWith(
      establishmentId,
      RealtimeEvents.tableStatusChanged,
      expect.any(Object),
    );
  });
});
