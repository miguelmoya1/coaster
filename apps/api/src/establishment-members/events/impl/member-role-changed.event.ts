import type { EstablishmentId, EstablishmentMemberId, EstablishmentRole, Role, UserId } from '@coaster/common';

export class MemberRoleChangedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly memberId: EstablishmentMemberId,
    public readonly userId: UserId,
    public readonly from: EstablishmentRole,
    public readonly to: EstablishmentRole,
    public readonly actorId: UserId,
    public readonly actorRole: Role,
  ) {}
}
