import type { BarId, PrintTicketPayloadDto } from '@coaster/common';

export class EnqueuePrintJobCommand {
  constructor(
    public readonly barId: BarId,
    public readonly payload: PrintTicketPayloadDto,
  ) {}
}
