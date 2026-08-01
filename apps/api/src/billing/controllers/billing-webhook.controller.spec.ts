import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HandleCheckoutCompletedCommand,
  HandleInvoicePaymentFailedCommand,
  HandleSubscriptionChangedCommand,
  RecordStripeWebhookEventCommand,
} from '../commands';
import { BillingWebhookController } from './billing-webhook.controller';

describe('BillingWebhookController', () => {
  let controller: BillingWebhookController;
  let commandBusMock: any;

  beforeEach(() => {
    commandBusMock = {
      execute: vi.fn().mockResolvedValue(undefined),
    };

    controller = new BillingWebhookController(commandBusMock);
  });

  it('should return received: true directly if already processed', async () => {
    const mockReq: any = {
      stripeEventAlreadyProcessed: true,
      stripeEvent: { id: 'evt_123', type: 'checkout.session.completed' },
    };

    const result = await controller.handleWebhook(mockReq);

    expect(commandBusMock.execute).not.toHaveBeenCalled();
    expect(result).toEqual({ received: true });
  });

  it('should dispatch HandleCheckoutCompletedCommand for checkout.session.completed', async () => {
    const session = { id: 'cs_123', mode: 'subscription' } as Stripe.Checkout.Session;
    const event = { id: 'evt_123', type: 'checkout.session.completed', data: { object: session } } as any;
    const mockReq: any = {
      stripeEventAlreadyProcessed: false,
      stripeEvent: event,
    };

    const result = await controller.handleWebhook(mockReq);

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleCheckoutCompletedCommand(session));
    expect(commandBusMock.execute).toHaveBeenCalledWith(new RecordStripeWebhookEventCommand(event));
    expect(result).toEqual({ received: true });
  });

  it('should dispatch HandleSubscriptionChangedCommand for customer.subscription.updated', async () => {
    const subscription = { id: 'sub_123', status: 'active' } as Stripe.Subscription;
    const event = { id: 'evt_456', type: 'customer.subscription.updated', data: { object: subscription } } as any;
    const mockReq: any = {
      stripeEventAlreadyProcessed: false,
      stripeEvent: event,
    };

    const result = await controller.handleWebhook(mockReq);

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleSubscriptionChangedCommand(subscription));
    expect(commandBusMock.execute).toHaveBeenCalledWith(new RecordStripeWebhookEventCommand(event));
    expect(result).toEqual({ received: true });
  });

  it('should dispatch HandleInvoicePaymentFailedCommand for invoice.payment_failed', async () => {
    const invoice = { id: 'in_123' } as Stripe.Invoice;
    const event = { id: 'evt_789', type: 'invoice.payment_failed', data: { object: invoice } } as any;
    const mockReq: any = {
      stripeEventAlreadyProcessed: false,
      stripeEvent: event,
    };

    const result = await controller.handleWebhook(mockReq);

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleInvoicePaymentFailedCommand(invoice));
    expect(commandBusMock.execute).toHaveBeenCalledWith(new RecordStripeWebhookEventCommand(event));
    expect(result).toEqual({ received: true });
  });
});
