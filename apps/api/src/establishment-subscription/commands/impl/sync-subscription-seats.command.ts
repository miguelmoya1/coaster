import type { EstablishmentId } from '@coaster/common';

export class SyncSubscriptionSeatsCommand {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
