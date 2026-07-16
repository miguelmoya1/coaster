import { BarId } from '@coaster/common';

export class SubscriptionCancelledEvent {
  constructor(
    public readonly barId: BarId,
    public readonly stripeSubscriptionId: string,
    public readonly cancelAtPeriodEnd: boolean,
    public readonly canceledAt?: Date,
  ) {}
}
