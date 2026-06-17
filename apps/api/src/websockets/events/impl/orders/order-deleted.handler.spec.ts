import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderDeletedHandler } from './order-deleted.handler';
import { BarGateway } from '../../../bar.gateway';
import { OrderDeletedEvent } from '../../../../events';
import { asBarId, asOrderId, SocketEvents } from '../../../../core';

describe('OrderDeletedHandler', () => {
  let handler: OrderDeletedHandler;
  let barGateway: BarGateway;

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
    barGateway = module.get<BarGateway>(BarGateway);
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
