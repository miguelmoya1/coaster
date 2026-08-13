import type { EstablishmentId } from '@coaster/common';

export class GetPrinterStatusQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
