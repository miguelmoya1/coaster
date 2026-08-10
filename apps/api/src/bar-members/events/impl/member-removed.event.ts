import type { BarId, BarMemberId, UserId } from '@coaster/common';

export class MemberRemovedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly memberId: BarMemberId,
    public readonly userId: UserId,
  ) {}
}
