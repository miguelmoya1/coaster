import type { EstablishmentId } from '@coaster/common';

export class SubscriptionCancelledEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly stripeSubscriptionId: string,
    public readonly canceledAt?: Date,
  ) {}
}
