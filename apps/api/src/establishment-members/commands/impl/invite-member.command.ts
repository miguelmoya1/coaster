import type { EstablishmentId, EstablishmentRole, User } from '@coaster/common';

export class InviteMemberCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly email: string,
    public readonly user: User,
    public readonly role?: EstablishmentRole,
  ) {}
}
