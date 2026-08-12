import type { EstablishmentId } from '@coaster/common';

export class DuplicateSubscriptionDetectedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly keptSubscriptionId: string,
    public readonly cancelledSubscriptionId: string,
  ) {}
}
