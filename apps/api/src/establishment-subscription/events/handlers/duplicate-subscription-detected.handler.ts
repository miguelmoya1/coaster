import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { DuplicateSubscriptionDetectedEvent } from '../impl/duplicate-subscription-detected.event';

@EventsHandler(DuplicateSubscriptionDetectedEvent)
export class DuplicateSubscriptionDetectedHandler implements IEventHandler<DuplicateSubscriptionDetectedEvent> {
  readonly #logger = new Logger(DuplicateSubscriptionDetectedHandler.name);

  handle(event: DuplicateSubscriptionDetectedEvent): void {
    this.#logger.error(
      `Billing incident on establishmentId=${event.establishmentId}: subscription ${event.cancelledSubscriptionId} duplicated ` +
        `${event.keptSubscriptionId} and was cancelled. Check Stripe for a charge on the cancelled one and ` +
        `refund it by hand if it went through.`,
    );
  }
}
