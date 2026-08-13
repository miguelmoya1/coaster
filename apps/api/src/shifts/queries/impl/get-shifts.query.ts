import type { EstablishmentId } from '@coaster/common';

export class GetShiftsQuery {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly startDateIso?: string,
    public readonly endDateIso?: string,
  ) {}
}
