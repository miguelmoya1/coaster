import type { BarId } from '@coaster/common';

export class SubscriptionOverriddenEvent {
  constructor(public readonly barId: BarId) {}
}
