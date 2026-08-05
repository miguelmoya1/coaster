import { firstValueFrom, of } from 'rxjs';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  StripeCheckoutCompletedEvent,
  StripeInvoicePaidEvent,
  StripeInvoicePaymentFailedEvent,
  StripeSubscriptionChangedEvent,
} from '../../stripe';
import {
  HandleCheckoutCompletedCommand,
  HandleInvoicePaidCommand,
  HandleInvoicePaymentFailedCommand,
  HandleSubscriptionChangedCommand,
} from '../commands';
import { BarSubscriptionSagas } from './bar-subscription.sagas';

describe('BarSubscriptionSagas', () => {
  let sagas: BarSubscriptionSagas;

  beforeEach(() => {
    sagas = new BarSubscriptionSagas();
  });

  it('should map StripeCheckoutCompletedEvent to HandleCheckoutCompletedCommand', async () => {
    const session = { id: 'cs_saga_123' } as Stripe.Checkout.Session;
    const event = new StripeCheckoutCompletedEvent(session);

    const command = await firstValueFrom(sagas.stripeCheckoutCompleted(of(event)));
    expect(command).toEqual(new HandleCheckoutCompletedCommand(session));
  });

  it('should map StripeSubscriptionChangedEvent to HandleSubscriptionChangedCommand', async () => {
    const subscription = { id: 'sub_saga_123' } as Stripe.Subscription;
    const event = new StripeSubscriptionChangedEvent(subscription);

    const command = await firstValueFrom(sagas.stripeSubscriptionChanged(of(event)));
    expect(command).toEqual(new HandleSubscriptionChangedCommand(subscription));
  });

  it('should map StripeInvoicePaidEvent to HandleInvoicePaidCommand', async () => {
    const invoice = { id: 'in_paid_saga_123' } as Stripe.Invoice;
    const event = new StripeInvoicePaidEvent(invoice);

    const command = await firstValueFrom(sagas.stripeInvoicePaid(of(event)));
    expect(command).toEqual(new HandleInvoicePaidCommand(invoice));
  });

  it('should map StripeInvoicePaymentFailedEvent to HandleInvoicePaymentFailedCommand', async () => {
    const invoice = { id: 'in_failed_saga_123' } as Stripe.Invoice;
    const event = new StripeInvoicePaymentFailedEvent(invoice);

    const command = await firstValueFrom(sagas.stripeInvoicePaymentFailed(of(event)));
    expect(command).toEqual(new HandleInvoicePaymentFailedCommand(invoice));
  });
});
