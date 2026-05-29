import { BarId, UserId } from '@coaster/common';

export class GetMemberMeQuery {
  constructor(
    public readonly barId: BarId,
    public readonly userId: UserId,
  ) {}
}
