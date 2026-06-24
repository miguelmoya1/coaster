import type { BarId } from '@coaster/common';

export class GetTablesByBarIdQuery {
  constructor(public readonly barId: BarId) {}
}
