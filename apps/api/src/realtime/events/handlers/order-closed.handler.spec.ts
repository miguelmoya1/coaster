import type { Order } from '@coaster/common';
import { asEstablishmentId, asTableId, RealtimeEvents, TableStatus } from '@coaster/common';
import { OrderClosedEvent } from '@coaster/orders';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { OrderClosedHandler } from './order-closed.handler';

describe('OrderClosedHandler', () => {
  let handler: OrderClosedHandler;
  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderClosedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<OrderClosedHandler>(OrderClosedHandler);
  });

  it('should emit ORDER_CLOSED event and set table status to FREE if table exists', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const order = { id: 'order-1' } as unknown as Order;
    const tableId = asTableId('table-1');
    const event = new OrderClosedEvent(establishmentId, order, tableId);

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.orderClosed, order);
    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.tableStatusChanged, {
      id: tableId,
      status: TableStatus.FREE,
    });
  });

  it('should only emit ORDER_CLOSED event if no table exists', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const order = { id: 'order-1' } as unknown as Order;
    const event = new OrderClosedEvent(establishmentId, order, null);

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.orderClosed, order);
    expect(realtime.publish).not.toHaveBeenCalledWith(
      establishmentId,
      RealtimeEvents.tableStatusChanged,
      expect.any(Object),
    );
  });
});
