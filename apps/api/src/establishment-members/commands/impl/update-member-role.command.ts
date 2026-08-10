import type { EstablishmentId, EstablishmentMemberId, EstablishmentRole, User } from '@coaster/common';

export class UpdateMemberRoleCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly memberId: EstablishmentMemberId,
    public readonly role: EstablishmentRole,
    public readonly actor: User,
  ) {}
}
