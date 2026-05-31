import { BarId } from '@coaster/common';

export class DeleteShiftCommand {
  constructor(
    public readonly barId: BarId,
    public readonly shiftId: string,
  ) {}
}
