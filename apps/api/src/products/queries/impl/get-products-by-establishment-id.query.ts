import type { EstablishmentId } from '@coaster/common';

export class GetProductsByEstablishmentIdQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
