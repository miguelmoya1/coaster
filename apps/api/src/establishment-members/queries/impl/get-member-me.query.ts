import type { EstablishmentId, User } from '@coaster/common';

export class GetMemberMeQuery {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly user: User,
  ) {}
}
