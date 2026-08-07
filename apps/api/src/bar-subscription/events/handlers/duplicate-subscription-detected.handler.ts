import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { DuplicateSubscriptionDetectedEvent } from '../impl/duplicate-subscription-detected.event';

/**
 * The duplicate is already cancelled by the time this runs, but Stripe may well have taken the
 * first payment for it, and no automated path gives that money back. This is the one place that
 * says so out loud, and the seam to hang a real alert (email, Slack) off when there is one.
 */
@EventsHandler(DuplicateSubscriptionDetectedEvent)
export class DuplicateSubscriptionDetectedHandler implements IEventHandler<DuplicateSubscriptionDetectedEvent> {
  readonly #logger = new Logger(DuplicateSubscriptionDetectedHandler.name);

  handle(event: DuplicateSubscriptionDetectedEvent): void {
    this.#logger.error(
      `Billing incident on barId=${event.barId}: subscription ${event.cancelledSubscriptionId} duplicated ` +
        `${event.keptSubscriptionId} and was cancelled. Check Stripe for a charge on the cancelled one and ` +
        `refund it by hand if it went through.`,
    );
  }
}
