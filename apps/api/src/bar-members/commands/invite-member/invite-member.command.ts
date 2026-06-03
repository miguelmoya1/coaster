import type { BarId, BarRole, User } from '@coaster/common';

export class InviteMemberCommand {
  constructor(
    public readonly barId: BarId,
    public readonly email: string,
    public readonly user: User,
    public readonly role?: BarRole,
  ) {}
}
