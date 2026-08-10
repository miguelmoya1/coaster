import type { EstablishmentId, PrintTicketPayloadDto } from '@coaster/common';

export class EnqueuePrintJobCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly payload: PrintTicketPayloadDto,
  ) {}
}
