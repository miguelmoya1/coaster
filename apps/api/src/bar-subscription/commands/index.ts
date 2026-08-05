export * from './impl/handle-checkout-completed.command';
export * from './impl/handle-invoice-paid.command';
export * from './impl/handle-invoice-payment-failed.command';
export * from './impl/handle-subscription-changed.command';

export * from './handlers/handle-checkout-completed.handler';
export * from './handlers/handle-invoice-paid.handler';
export * from './handlers/handle-invoice-payment-failed.handler';
export * from './handlers/handle-subscription-changed.handler';

import { HandleCheckoutCompletedHandler } from './handlers/handle-checkout-completed.handler';
import { HandleInvoicePaidHandler } from './handlers/handle-invoice-paid.handler';
import { HandleInvoicePaymentFailedHandler } from './handlers/handle-invoice-payment-failed.handler';
import { HandleSubscriptionChangedHandler } from './handlers/handle-subscription-changed.handler';

export const CommandHandlers = [
  HandleCheckoutCompletedHandler,
  HandleSubscriptionChangedHandler,
  HandleInvoicePaymentFailedHandler,
  HandleInvoicePaidHandler,
];
