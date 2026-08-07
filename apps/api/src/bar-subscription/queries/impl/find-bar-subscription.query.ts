import type { BarId } from '@coaster/common';

export class FindBarSubscriptionQuery {
  constructor(public readonly barId: BarId) {}
}
