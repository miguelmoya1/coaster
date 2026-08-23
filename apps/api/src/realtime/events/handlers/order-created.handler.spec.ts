import type { Order } from '@coaster/common';
import { asEstablishmentId, asTableId, RealtimeEvents, TableStatus } from '@coaster/common';
import { OrderCreatedEvent } from '@coaster/orders';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { OrderCreatedHandler } from './order-created.handler';

describe('OrderCreatedHandler', () => {
  let handler: OrderCreatedHandler;
  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderCreatedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<OrderCreatedHandler>(OrderCreatedHandler);
  });

  it('should emit ORDER_CREATED event and set table status to OCCUPIED if table exists', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const order = { id: 'order-1' } as unknown as Order;
    const tableId = asTableId('table-1');
    const event = new OrderCreatedEvent(establishmentId, order, tableId);

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.orderCreated, order);
    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.tableStatusChanged, {
      id: tableId,
      status: TableStatus.OCCUPIED,
    });
  });

  it('should only emit ORDER_CREATED event if no table exists', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const order = { id: 'order-1' } as unknown as Order;
    const event = new OrderCreatedEvent(establishmentId, order, null);

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.orderCreated, order);
    expect(realtime.publish).not.toHaveBeenCalledWith(
      establishmentId,
      RealtimeEvents.tableStatusChanged,
      expect.any(Object),
    );
  });
});
