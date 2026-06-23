import type { BarId, BarRole, UserId } from '@coaster/common';

export class CompleteInviteMemberCommand {
  constructor(
    public readonly userId: UserId,
    public readonly barId: BarId,
    public readonly role: BarRole | undefined,
    public readonly inviterLanguage: string,
  ) {}
}
