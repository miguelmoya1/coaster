import type { BarId, BarRole, UserId } from '@coaster/common';

export class InviteMemberCommand {
  constructor(
    public readonly userId: UserId,
    public readonly barId: BarId,
    public readonly role?: BarRole,
  ) {}
}
