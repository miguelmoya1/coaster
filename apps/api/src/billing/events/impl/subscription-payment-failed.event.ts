import { BarId } from '@coaster/common';

export class SubscriptionPaymentFailedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly stripeCustomerId: string,
  ) {}
}
