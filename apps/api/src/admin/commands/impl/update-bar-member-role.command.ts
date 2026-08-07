import type { BarId, BarRole, User, UserId } from '@coaster/common';

export class UpdateBarMemberRoleCommand {
  constructor(
    public readonly barId: BarId,
    public readonly userId: UserId,
    public readonly role: BarRole,
    public readonly actor: User,
  ) {}
}
