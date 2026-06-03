import type { BarId } from '@coaster/common';

export class GetShiftsQuery {
  constructor(
    public readonly barId: BarId,
    public readonly startDateIso?: string,
    public readonly endDateIso?: string,
  ) {}
}
