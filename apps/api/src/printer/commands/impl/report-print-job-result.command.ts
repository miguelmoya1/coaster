import type { BarId, PrintJobResultDto } from '@coaster/common';

export class ReportPrintJobResultCommand {
  constructor(
    public readonly barId: BarId,
    public readonly jobId: string,
    public readonly deviceKey: string | undefined,
    public readonly result: PrintJobResultDto,
  ) {}
}
