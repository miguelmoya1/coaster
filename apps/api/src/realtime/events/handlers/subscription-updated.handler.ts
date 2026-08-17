import {
  SubscriptionActivatedEvent,
  SubscriptionCancelledEvent,
  SubscriptionOverriddenEvent,
  SubscriptionPaymentFailedEvent,
  SubscriptionRenewedEvent,
} from '@coaster/establishment-subscription';
import { RealtimeEvents } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RealtimeService } from '../../services';

type SubscriptionEvent =
  | SubscriptionActivatedEvent
  | SubscriptionRenewedEvent
  | SubscriptionCancelledEvent
  | SubscriptionPaymentFailedEvent
  | SubscriptionOverriddenEvent;

@EventsHandler(
  SubscriptionActivatedEvent,
  SubscriptionRenewedEvent,
  SubscriptionCancelledEvent,
  SubscriptionPaymentFailedEvent,
  SubscriptionOverriddenEvent,
)
export class SubscriptionUpdatedHandler implements IEventHandler<SubscriptionEvent> {
  readonly #logger = new Logger(SubscriptionUpdatedHandler.name);

  constructor(private readonly _realtime: RealtimeService) {}

  handle(event: SubscriptionEvent) {
    this.#logger.debug(`Catching SubscriptionEvent for establishmentId=${event.establishmentId}...`);
    this._realtime.publish(event.establishmentId, RealtimeEvents.subscriptionUpdated, {
      establishmentId: event.establishmentId,
    });
  }
}
