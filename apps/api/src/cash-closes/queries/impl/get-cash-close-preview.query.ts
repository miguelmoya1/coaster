import type { EstablishmentId } from '@coaster/common';

export class GetCashClosePreviewQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
