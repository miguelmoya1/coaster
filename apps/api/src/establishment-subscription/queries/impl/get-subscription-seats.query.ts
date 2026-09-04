import type { EstablishmentId } from '@coaster/common';

export class GetSubscriptionSeatsQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
