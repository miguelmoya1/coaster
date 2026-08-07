import {
  SubscriptionCancelledEvent,
  SubscriptionPaymentFailedEvent,
  SubscriptionRenewedEvent,
} from '@coaster/bar-subscription';
import { SocketEvents, asBarId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../../bar.gateway';
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
          provide: BarGateway,
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
    const event = new SubscriptionRenewedEvent(asBarId('bar-1'), 'sub_123');
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('bar-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.subscriptionUpdated, { barId: 'bar-1' });
  });

  it('should emit SUBSCRIPTION_UPDATED event when SubscriptionCancelledEvent is received', () => {
    const event = new SubscriptionCancelledEvent(asBarId('bar-1'), 'sub_123', new Date());
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('bar-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.subscriptionUpdated, { barId: 'bar-1' });
  });

  it('should emit SUBSCRIPTION_UPDATED event when a payment fails, so clients see the bar go past due', () => {
    const event = new SubscriptionPaymentFailedEvent(asBarId('bar-1'), 'cus_123');
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('bar-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.subscriptionUpdated, { barId: 'bar-1' });
  });
});
