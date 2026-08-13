import type { EstablishmentId } from '@coaster/common';

export class GetPrintJobQuery {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly jobId: string,
  ) {}
}
