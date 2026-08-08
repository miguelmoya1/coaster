import type { BarId, Role, TimeEntry, UserId } from '@coaster/common';

export class TimeEntryAmendedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly entry: TimeEntry,
    public readonly previousOccurredAt: string,
    public readonly actorId: UserId,
    public readonly actorRole: Role,
    public readonly reason: string,
  ) {}
}
