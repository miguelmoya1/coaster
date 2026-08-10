import type { EstablishmentId, EstablishmentMemberId } from '@coaster/common';

export class MemberInvitedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly memberId: EstablishmentMemberId,
    public readonly email: string,
    public readonly establishmentName: string,
    public readonly inviterName: string,
    public readonly inviterLanguage: string,
  ) {}
}
