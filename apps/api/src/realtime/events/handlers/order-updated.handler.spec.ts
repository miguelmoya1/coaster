import type { Order } from '@coaster/common';
import { asEstablishmentId, RealtimeEvents } from '@coaster/common';
import { OrderUpdatedEvent } from '@coaster/orders';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { OrderUpdatedHandler } from './order-updated.handler';

describe('OrderUpdatedHandler', () => {
  let handler: OrderUpdatedHandler;
  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderUpdatedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<OrderUpdatedHandler>(OrderUpdatedHandler);
  });

  it('should emit ORDER_UPDATED event', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const order = { id: 'order-1' } as unknown as Order;
    const event = new OrderUpdatedEvent(establishmentId, order);

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.orderUpdated, order);
  });
});
