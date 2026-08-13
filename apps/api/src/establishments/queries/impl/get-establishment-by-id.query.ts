import type { EstablishmentId } from '@coaster/common';

export class GetEstablishmentByIdQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
