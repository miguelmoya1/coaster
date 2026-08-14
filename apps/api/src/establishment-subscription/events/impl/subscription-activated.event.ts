import type { EstablishmentId } from '@coaster/common';

export class SubscriptionActivatedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly stripeSubscriptionId: string,
  ) {}
}
