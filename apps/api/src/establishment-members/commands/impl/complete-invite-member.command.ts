import type { EstablishmentId, EstablishmentRole, UserId } from '@coaster/common';

export class CompleteInviteMemberCommand {
  constructor(
    public readonly userId: UserId,
    public readonly establishmentId: EstablishmentId,
    public readonly role: EstablishmentRole | undefined,
    public readonly inviterLanguage: string,
  ) {}
}
