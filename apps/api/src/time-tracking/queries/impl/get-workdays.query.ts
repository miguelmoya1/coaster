import type { EstablishmentId, UserId } from '@coaster/common';

export class GetWorkdaysQuery {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly from: string,
    public readonly to: string,
    public readonly userId?: UserId,
  ) {}
}
