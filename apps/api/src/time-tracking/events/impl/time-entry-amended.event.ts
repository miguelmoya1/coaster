import type { EstablishmentId, Role, TimeEntry, UserId } from '@coaster/common';

export class TimeEntryAmendedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly entry: TimeEntry,
    public readonly previousOccurredAt: string,
    public readonly actorId: UserId,
    public readonly actorRole: Role,
    public readonly reason: string,
  ) {}
}
