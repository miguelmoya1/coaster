import type { BarId, User } from '@coaster/common';

export class GetMemberMeQuery {
  constructor(
    public readonly barId: BarId,
    public readonly user: User,
  ) {}
}
