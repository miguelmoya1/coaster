import type { BarId } from '@coaster/common';

export class GetBarStatsQuery {
  constructor(public readonly barId: BarId) {}
}
