import { BarId, SubscriptionPlan } from '@coaster/common';

export class CreateCheckoutSessionCommand {
  constructor(
    public readonly barId: BarId,
    public readonly plan: Exclude<SubscriptionPlan, 'FREE'>,
  ) {}
}
