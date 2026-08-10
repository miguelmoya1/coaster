import { SocketEvents, asEstablishmentId, asOrderId } from '@coaster/common';
import { OrderDeletedEvent } from '@coaster/orders';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
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
          provide: EstablishmentGateway,
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

  it('should emit ORDER_DELETED event to the correct establishment room', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const orderId = asOrderId('order-1');
    const event = new OrderDeletedEvent(establishmentId, orderId);
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('establishment-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.orderDeleted, { id: orderId });
  });
});
