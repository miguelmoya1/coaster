import type { EstablishmentId, UserId } from '@coaster/common';

export class EstablishmentCreatedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly ownerId: UserId,
  ) {}
}
