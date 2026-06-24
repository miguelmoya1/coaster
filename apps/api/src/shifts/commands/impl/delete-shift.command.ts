import type { BarId, ShiftId } from '@coaster/common';

export class DeleteShiftCommand {
  constructor(
    public readonly barId: BarId,
    public readonly shiftId: ShiftId,
  ) {}
}
