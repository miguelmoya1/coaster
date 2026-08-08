import type { BarId, UserId } from '@coaster/common';

export class GetWorkdaysQuery {
  constructor(
    public readonly barId: BarId,
    public readonly from: string,
    public readonly to: string,
    public readonly userId?: UserId,
  ) {}
}
