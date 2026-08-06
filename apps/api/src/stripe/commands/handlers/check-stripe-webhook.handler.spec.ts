import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  StripeCheckoutCompletedEvent,
  StripeInvoicePaidEvent,
  StripeInvoicePaymentFailedEvent,
  StripeSubscriptionChangedEvent,
} from '../../events';
import type { StripeWebhookDispatcher } from '../../services';
import { CheckStripeWebhookCommand } from '../impl/check-stripe-webhook.command';
import { CheckStripeWebhookHandler } from './check-stripe-webhook.handler';

describe('CheckStripeWebhookHandler', () => {
  let handler: CheckStripeWebhookHandler;
  let dispatcherMock: { dispatch: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    dispatcherMock = {
      dispatch: vi.fn().mockResolvedValue(undefined),
    };
    handler = new CheckStripeWebhookHandler(dispatcherMock as unknown as StripeWebhookDispatcher);
  });

  it('should dispatch StripeCheckoutCompletedEvent when event type is checkout.session.completed', async () => {
    const session = { id: 'cs_test_123', object: 'checkout.session' } as Stripe.Checkout.Session;
    const event = {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: session },
    } as Stripe.Event;

    await handler.execute(new CheckStripeWebhookCommand(event));

    expect(dispatcherMock.dispatch).toHaveBeenCalledWith(new StripeCheckoutCompletedEvent(session));
  });

  it.each([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.paused',
    'customer.subscription.resumed',
  ])('should dispatch StripeSubscriptionChangedEvent when event type is %s', async (eventType) => {
    const subscription = { id: 'sub_test_123', object: 'subscription' } as Stripe.Subscription;
    const event = {
      id: 'evt_2',
      type: eventType,
      data: { object: subscription },
    } as Stripe.Event;

    await handler.execute(new CheckStripeWebhookCommand(event));

    expect(dispatcherMock.dispatch).toHaveBeenCalledWith(new StripeSubscriptionChangedEvent(subscription));
  });

  it('should dispatch StripeInvoicePaymentFailedEvent when event type is invoice.payment_failed', async () => {
    const invoice = { id: 'in_failed_123', object: 'invoice' } as Stripe.Invoice;
    const event = {
      id: 'evt_3',
      type: 'invoice.payment_failed',
      data: { object: invoice },
    } as Stripe.Event;

    await handler.execute(new CheckStripeWebhookCommand(event));

    expect(dispatcherMock.dispatch).toHaveBeenCalledWith(new StripeInvoicePaymentFailedEvent(invoice));
  });

  it('should dispatch StripeInvoicePaidEvent when event type is invoice.paid', async () => {
    const invoice = { id: 'in_paid_123', object: 'invoice' } as Stripe.Invoice;
    const event = {
      id: 'evt_4',
      type: 'invoice.paid',
      data: { object: invoice },
    } as Stripe.Event;

    await handler.execute(new CheckStripeWebhookCommand(event));

    expect(dispatcherMock.dispatch).toHaveBeenCalledWith(new StripeInvoicePaidEvent(invoice));
  });

  it('should do nothing for unhandled event types', async () => {
    const event = {
      id: 'evt_5',
      type: 'payment_intent.succeeded',
      data: { object: {} },
    } as Stripe.Event;

    await handler.execute(new CheckStripeWebhookCommand(event));

    expect(dispatcherMock.dispatch).not.toHaveBeenCalled();
  });
});
