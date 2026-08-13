import type { EstablishmentId } from '@coaster/common';

export class GetAdminEstablishmentDetailQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
