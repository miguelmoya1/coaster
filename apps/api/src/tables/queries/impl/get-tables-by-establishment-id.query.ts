import type { EstablishmentId } from '@coaster/common';

export class GetTablesByEstablishmentIdQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
