import { BarId } from '@coaster/common';

export class SubscriptionRenewedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly stripeSubscriptionId: string,
    public readonly currentPeriodEnd?: Date,
  ) {}
}
