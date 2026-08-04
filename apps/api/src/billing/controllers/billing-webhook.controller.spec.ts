import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HandleCheckoutCompletedCommand,
  HandleInvoicePaidCommand,
  HandleInvoicePaymentFailedCommand,
  HandleSubscriptionChangedCommand,
} from '../commands';
import { BillingWebhookController } from './billing-webhook.controller';

describe('BillingWebhookController', () => {
  let controller: BillingWebhookController;
  let commandBusMock: any;
  let writeRepoMock: any;

  beforeEach(() => {
    commandBusMock = {
      execute: vi.fn().mockResolvedValue(undefined),
    };
    writeRepoMock = {
      claimStripeWebhookEvent: vi.fn().mockResolvedValue(true),
      markStripeWebhookEventProcessed: vi.fn(),
      markStripeWebhookEventFailed: vi.fn(),
    };

    controller = new BillingWebhookController(commandBusMock, writeRepoMock);
  });

  it('should return received: true directly if already processed', async () => {
    const mockReq: any = {
      stripeEvent: { id: 'evt_123', type: 'checkout.session.completed' },
    };
    writeRepoMock.claimStripeWebhookEvent.mockResolvedValue(false);

    const result = await controller.handleWebhook(mockReq);

    expect(commandBusMock.execute).not.toHaveBeenCalled();
    expect(result).toEqual({ received: true });
  });

  it('should dispatch HandleCheckoutCompletedCommand for checkout.session.completed', async () => {
    const session = { id: 'cs_123', mode: 'subscription' } as Stripe.Checkout.Session;
    const event = { id: 'evt_123', type: 'checkout.session.completed', data: { object: session } } as any;
    const mockReq: any = {
      stripeEvent: event,
    };

    const result = await controller.handleWebhook(mockReq);

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleCheckoutCompletedCommand(session));
    expect(writeRepoMock.markStripeWebhookEventProcessed).toHaveBeenCalledWith(event.id);
    expect(result).toEqual({ received: true });
  });

  it('should dispatch HandleSubscriptionChangedCommand for customer.subscription.updated', async () => {
    const subscription = { id: 'sub_123', status: 'active' } as Stripe.Subscription;
    const event = { id: 'evt_456', type: 'customer.subscription.updated', data: { object: subscription } } as any;
    const mockReq: any = {
      stripeEvent: event,
    };

    const result = await controller.handleWebhook(mockReq);

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleSubscriptionChangedCommand(subscription));
    expect(writeRepoMock.markStripeWebhookEventProcessed).toHaveBeenCalledWith(event.id);
    expect(result).toEqual({ received: true });
  });

  it('should dispatch HandleInvoicePaymentFailedCommand for invoice.payment_failed', async () => {
    const invoice = { id: 'in_123' } as Stripe.Invoice;
    const event = { id: 'evt_789', type: 'invoice.payment_failed', data: { object: invoice } } as any;
    const mockReq: any = {
      stripeEvent: event,
    };

    const result = await controller.handleWebhook(mockReq);

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleInvoicePaymentFailedCommand(invoice));
    expect(writeRepoMock.markStripeWebhookEventProcessed).toHaveBeenCalledWith(event.id);
    expect(result).toEqual({ received: true });
  });

  it('should dispatch invoice.paid to recover a past-due subscription', async () => {
    const invoice = { id: 'in_123' } as Stripe.Invoice;
    const event = { id: 'evt_paid', type: 'invoice.paid', data: { object: invoice } } as any;

    await controller.handleWebhook({ stripeEvent: event });

    expect(commandBusMock.execute).toHaveBeenCalledWith(new HandleInvoicePaidCommand(invoice));
    expect(writeRepoMock.markStripeWebhookEventProcessed).toHaveBeenCalledWith(event.id);
  });

  it('should mark failed events for a safe retry', async () => {
    const error = new Error('temporary failure');
    commandBusMock.execute.mockRejectedValueOnce(error);
    const event = {
      id: 'evt_failed',
      type: 'checkout.session.completed',
      data: { object: { mode: 'subscription' } },
    } as any;

    await expect(controller.handleWebhook({ stripeEvent: event })).rejects.toThrow(error);
    expect(writeRepoMock.markStripeWebhookEventFailed).toHaveBeenCalledWith(event.id, error);
    expect(writeRepoMock.markStripeWebhookEventProcessed).not.toHaveBeenCalledWith(event.id);
  });
});
