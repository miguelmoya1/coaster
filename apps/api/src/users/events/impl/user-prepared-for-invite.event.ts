import { EstablishmentId, EstablishmentRole, UserId } from '@coaster/common';

export class UserPreparedForInviteEvent {
  constructor(
    public readonly userId: UserId,
    public readonly establishmentId: EstablishmentId,
    public readonly role: EstablishmentRole | undefined,
    public readonly inviterLanguage: string,
  ) {}
}
