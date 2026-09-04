import type { EstablishmentId, Role, TimeEntry, UserId } from '@coaster/common';

export class TimeEntryRecordedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly entry: TimeEntry,
    public readonly actorId: UserId,
    public readonly actorRole: Role,
    public readonly reason: string | null,
  ) {}
}
