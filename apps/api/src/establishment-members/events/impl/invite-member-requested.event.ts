import type { EstablishmentId, EstablishmentRole } from '@coaster/common';

export class InviteMemberRequestedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly email: string,
    public readonly role: EstablishmentRole | undefined,
    public readonly inviterLanguage: string,
  ) {}
}
