import type { EstablishmentId, PrintJobResultDto } from '@coaster/common';

export class ReportPrintJobResultCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly jobId: string,
    public readonly deviceKey: string | undefined,
    public readonly result: PrintJobResultDto,
  ) {}
}
