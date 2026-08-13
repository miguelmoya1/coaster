import type { EstablishmentId } from '@coaster/common';

export class FindEstablishmentSubscriptionQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
