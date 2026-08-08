import type { BarId, BarMemberId, BarRole, Role, UserId } from '@coaster/common';

export class MemberRoleChangedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly memberId: BarMemberId,
    public readonly userId: UserId,
    public readonly from: BarRole,
    public readonly to: BarRole,
    public readonly actorId: UserId,
    public readonly actorRole: Role,
  ) {}
}
