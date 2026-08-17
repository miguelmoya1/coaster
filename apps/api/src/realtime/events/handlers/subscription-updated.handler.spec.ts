import {
  SubscriptionCancelledEvent,
  SubscriptionPaymentFailedEvent,
  SubscriptionRenewedEvent,
} from '@coaster/establishment-subscription';
import { SocketEvents, asEstablishmentId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { SubscriptionUpdatedHandler } from './subscription-updated.handler';

describe('SubscriptionUpdatedHandler', () => {
  let handler: SubscriptionUpdatedHandler;

  const mockEmit = vi.fn();
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionUpdatedHandler,
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

    handler = module.get<SubscriptionUpdatedHandler>(SubscriptionUpdatedHandler);
    vi.clearAllMocks();
  });

  it('should emit SUBSCRIPTION_UPDATED event when SubscriptionRenewedEvent is received', () => {
    const event = new SubscriptionRenewedEvent(asEstablishmentId('establishment-1'), 'sub_123');
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('establishment-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.subscriptionUpdated, { establishmentId: 'establishment-1' });
  });

  it('should emit SUBSCRIPTION_UPDATED event when SubscriptionCancelledEvent is received', () => {
    const event = new SubscriptionCancelledEvent(asEstablishmentId('establishment-1'), 'sub_123', new Date());
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('establishment-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.subscriptionUpdated, { establishmentId: 'establishment-1' });
  });

  it('should emit SUBSCRIPTION_UPDATED event when a payment fails, so clients see the establishment go past due', () => {
    const event = new SubscriptionPaymentFailedEvent(asEstablishmentId('establishment-1'), 'cus_123');
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('establishment-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.subscriptionUpdated, { establishmentId: 'establishment-1' });
  });
});
