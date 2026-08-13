import type { EstablishmentId, ShiftId } from '@coaster/common';

export class DeleteShiftCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly shiftId: ShiftId,
  ) {}
}
