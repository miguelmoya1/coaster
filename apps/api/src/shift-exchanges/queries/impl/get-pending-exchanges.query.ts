import type { BarId } from '@coaster/common';

export class GetPendingExchangesQuery {
  constructor(public readonly barId: BarId) {}
}
