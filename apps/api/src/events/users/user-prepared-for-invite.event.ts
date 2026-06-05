import { BarId, BarRole, UserId } from '@coaster/common';

export class UserPreparedForInviteEvent {
  constructor(
    public readonly userId: UserId,
    public readonly barId: BarId,
    public readonly role?: BarRole,
  ) {}
}
