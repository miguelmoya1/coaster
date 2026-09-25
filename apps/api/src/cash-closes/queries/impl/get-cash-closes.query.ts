import type { EstablishmentId } from '@coaster/common';

export class GetCashClosesQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
