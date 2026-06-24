import { Test, TestingModule } from '@nestjs/testing';
import { OrderDeletedEvent } from '@orders/events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asOrderId, SocketEvents } from '../../../core';
import { BarGateway } from '../../bar.gateway';
import { OrderDeletedHandler } from './order-deleted.handler';

describe('OrderDeletedHandler', () => {
  let handler: OrderDeletedHandler;

  const mockEmit = vi.fn();
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderDeletedHandler,
        {
          provide: BarGateway,
          useValue: {
            server: {
              to: mockTo,
            },
          },
        },
      ],
    }).compile();

    handler = module.get<OrderDeletedHandler>(OrderDeletedHandler);
    vi.clearAllMocks();
  });

  it('should emit ORDER_DELETED event to the correct bar room', () => {
    const barId = asBarId('bar-1');
    const orderId = asOrderId('order-1');
    const event = new OrderDeletedEvent(barId, orderId);
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('bar-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.ORDER_DELETED, { id: orderId });
  });
});
