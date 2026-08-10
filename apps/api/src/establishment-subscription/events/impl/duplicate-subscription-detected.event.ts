import type { EstablishmentId } from '@coaster/common';

/**
 * Raised when a second Stripe subscription completed for an establishment that already had a live one. The
 * duplicate is cancelled before this fires, but the customer may already have been charged for it,
 * so the event exists to make that visible rather than let it pass silently.
 */
export class DuplicateSubscriptionDetectedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly keptSubscriptionId: string,
    public readonly cancelledSubscriptionId: string,
  ) {}
}
