import type { BarId } from '@coaster/common';

export class GetOrdersByBarIdQuery {
  constructor(
    public readonly barId: BarId,
    public readonly status?: string,
  ) {}
}
