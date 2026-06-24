import type { BarId, ShiftId } from '@coaster/common';

export class ShiftDeletedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly shiftId: ShiftId,
  ) {}
}
