import type { EstablishmentId, Shift } from '@coaster/common';

export class ShiftCreatedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly shift: Shift,
  ) {}
}
