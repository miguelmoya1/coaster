import type { EstablishmentId, EstablishmentMemberId, User } from '@coaster/common';

export class ResendInviteCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly memberId: EstablishmentMemberId,
    public readonly user: User,
  ) {}
}
