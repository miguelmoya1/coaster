import { RealtimeEvents, asEstablishmentId, asOrderId } from '@coaster/common';
import { OrderDeletedEvent } from '@coaster/orders';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { OrderDeletedHandler } from './order-deleted.handler';

describe('OrderDeletedHandler', () => {
  let handler: OrderDeletedHandler;

  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderDeletedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<OrderDeletedHandler>(OrderDeletedHandler);
    vi.clearAllMocks();
  });

  it('should emit ORDER_DELETED event to the establishment', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const orderId = asOrderId('order-1');
    const event = new OrderDeletedEvent(establishmentId, orderId);
    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith('establishment-1', RealtimeEvents.orderDeleted, { id: orderId });
  });
});
