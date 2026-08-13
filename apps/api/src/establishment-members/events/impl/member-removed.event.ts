import type { EstablishmentId, EstablishmentMemberId, UserId } from '@coaster/common';

export class MemberRemovedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly memberId: EstablishmentMemberId,
    public readonly userId: UserId,
  ) {}
}
