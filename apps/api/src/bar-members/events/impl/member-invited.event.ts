import type { BarId, BarMemberId } from '@coaster/common';

export class MemberInvitedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly memberId: BarMemberId,
    public readonly email: string,
    public readonly barName: string,
    public readonly inviterName: string,
    public readonly inviterLanguage: string,
  ) {}
}
