import { BarId } from '@coaster/common';

export class GetBarSubscriptionQuery {
  constructor(public readonly barId: BarId) {}
}
