import type { EstablishmentId } from '@coaster/common';

export class GetPrinterConnectionQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
