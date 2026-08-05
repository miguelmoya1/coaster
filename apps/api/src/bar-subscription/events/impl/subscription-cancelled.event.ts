import type { BarId } from '@coaster/common';

export class SubscriptionCancelledEvent {
  constructor(
    public readonly barId: BarId,
    public readonly stripeSubscriptionId: string,
    public readonly canceledAt?: Date,
  ) {}
}
