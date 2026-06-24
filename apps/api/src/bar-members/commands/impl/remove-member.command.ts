import type { BarId, BarMemberId } from '@coaster/common';

export class RemoveMemberCommand {
  constructor(
    public readonly barId: BarId,
    public readonly memberId: BarMemberId,
  ) {}
}
