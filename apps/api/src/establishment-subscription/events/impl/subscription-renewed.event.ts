import type { EstablishmentId } from '@coaster/common';

export class SubscriptionRenewedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly stripeSubscriptionId: string,
    public readonly currentPeriodEnd?: Date,
  ) {}
}
