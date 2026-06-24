import type { BarId, BarRole } from '@coaster/common';

export class InviteMemberRequestedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly email: string,
    public readonly role: BarRole | undefined,
    public readonly inviterLanguage: string,
  ) {}
}
