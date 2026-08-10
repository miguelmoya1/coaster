import type { EstablishmentId, EstablishmentMemberId } from '@coaster/common';

export class RemoveMemberCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly memberId: EstablishmentMemberId,
  ) {}
}
