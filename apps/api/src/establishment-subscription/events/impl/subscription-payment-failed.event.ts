import type { EstablishmentId } from '@coaster/common';

export class SubscriptionPaymentFailedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly stripeCustomerId: string,
  ) {}
}
