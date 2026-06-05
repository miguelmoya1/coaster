import type { BarId } from '@coaster/common';

export class GetProductsByBarIdQuery {
  constructor(public readonly barId: BarId) {}
}
