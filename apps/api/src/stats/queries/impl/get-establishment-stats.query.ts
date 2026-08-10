import type { EstablishmentId } from '@coaster/common';

export class GetEstablishmentStatsQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
