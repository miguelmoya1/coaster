import type { Order } from '@coaster/common';
import { asEstablishmentId, SocketEvents } from '@coaster/common';
import { OrderUpdatedEvent } from '@coaster/orders';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { OrderUpdatedHandler } from './order-updated.handler';

describe('OrderUpdatedHandler', () => {
  let handler: OrderUpdatedHandler;
  const establishmentGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderUpdatedHandler, { provide: EstablishmentGateway, useValue: establishmentGateway }],
    }).compile();

    handler = module.get<OrderUpdatedHandler>(OrderUpdatedHandler);
  });

  it('should emit ORDER_UPDATED event', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const order = { id: 'order-1' } as unknown as Order;
    const event = new OrderUpdatedEvent(establishmentId, order);

    handler.handle(event);

    expect(establishmentGateway.server.to).toHaveBeenCalledWith(establishmentId);
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.orderUpdated, order);
  });
});
