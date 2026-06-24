import type { BarId } from '@coaster/common';

export class GetOrdersByDateQuery {
  constructor(
    public readonly barId: BarId,
    public readonly date: string,
  ) {}
}
