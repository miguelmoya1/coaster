import { Injectable, Logger } from '@nestjs/common';
import { ICommand, ofType, Saga } from '@nestjs/cqrs';
import { map, Observable } from 'rxjs';
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

@Injectable()
export class BarSubscriptionSagas {
  readonly #logger = new Logger(BarSubscriptionSagas.name);

  @Saga()
  stripeCheckoutCompleted = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(StripeCheckoutCompletedEvent),
      map((event: StripeCheckoutCompletedEvent) => {
        this.#logger.debug(`Saga catching StripeCheckoutCompletedEvent for session ${event.session.id}`);
        return new HandleCheckoutCompletedCommand(event.session);
      }),
    );
  };

  @Saga()
  stripeSubscriptionChanged = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(StripeSubscriptionChangedEvent),
      map((event: StripeSubscriptionChangedEvent) => {
        this.#logger.debug(`Saga catching StripeSubscriptionChangedEvent for subscription ${event.subscription.id}`);
        return new HandleSubscriptionChangedCommand(event.subscription);
      }),
    );
  };

  @Saga()
  stripeInvoicePaid = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(StripeInvoicePaidEvent),
      map((event: StripeInvoicePaidEvent) => {
        this.#logger.debug(`Saga catching StripeInvoicePaidEvent for invoice ${event.invoice.id}`);
        return new HandleInvoicePaidCommand(event.invoice);
      }),
    );
  };

  @Saga()
  stripeInvoicePaymentFailed = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(StripeInvoicePaymentFailedEvent),
      map((event: StripeInvoicePaymentFailedEvent) => {
        this.#logger.debug(`Saga catching StripeInvoicePaymentFailedEvent for invoice ${event.invoice.id}`);
        return new HandleInvoicePaymentFailedCommand(event.invoice);
      }),
    );
  };
}
