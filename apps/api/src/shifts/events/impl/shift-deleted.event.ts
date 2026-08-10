import type { EstablishmentId, ShiftId } from '@coaster/common';

export class ShiftDeletedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly shiftId: ShiftId,
  ) {}
}
