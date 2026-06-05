import type { BarId, Shift } from '@coaster/common';

export class ShiftCreatedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly shift: Shift,
  ) {}
}
