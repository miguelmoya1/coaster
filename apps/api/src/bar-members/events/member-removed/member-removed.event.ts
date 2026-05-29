import { BarId, BarMemberId } from '@coaster/common';

export class MemberRemovedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly memberId: BarMemberId,
  ) {}
}
