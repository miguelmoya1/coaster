import type { EstablishmentId } from '@coaster/common';

export class ClaimNextPrintJobQuery {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly deviceKey: string | undefined,
  ) {}
}
