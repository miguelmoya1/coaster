import type { BarId, BarMemberId, BarRole, User } from '@coaster/common';

export class UpdateMemberRoleCommand {
  constructor(
    public readonly barId: BarId,
    public readonly memberId: BarMemberId,
    public readonly role: BarRole,
    public readonly actor: User,
  ) {}
}
