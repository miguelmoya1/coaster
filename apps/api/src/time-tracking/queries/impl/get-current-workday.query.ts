import type { EstablishmentId, UserId } from '@coaster/common';

export class GetCurrentWorkdayQuery {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly userId: UserId,
  ) {}
}
