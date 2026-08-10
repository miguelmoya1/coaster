import type { BarId, Role, TimeEntry, UserId } from '@coaster/common';

export class TimeEntryRecordedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly entry: TimeEntry,
    public readonly actorId: UserId,
    public readonly actorRole: Role,
    public readonly reason: string | null,
  ) {}
}
