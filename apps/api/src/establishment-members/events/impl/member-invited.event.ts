import type { EstablishmentId, EstablishmentMemberId, UserId } from '@coaster/common';

export class MemberInvitedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly memberId: EstablishmentMemberId,
    public readonly email: string,
    public readonly establishmentName: string,
    public readonly inviterName: string,
    public readonly inviterLanguage: string,
    public readonly userId: UserId,
  ) {}
}
