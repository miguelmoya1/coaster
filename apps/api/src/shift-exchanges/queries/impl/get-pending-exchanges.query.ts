import type { EstablishmentId } from '@coaster/common';

export class GetPendingExchangesQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
