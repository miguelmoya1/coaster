import { BarId, BarRole, User } from '@coaster/common';

export class InviteMemberCommand {
  constructor(
    public readonly barId: BarId,
    public readonly email: string,
    public readonly role: BarRole,
    public readonly user: User,
  ) {}
}
