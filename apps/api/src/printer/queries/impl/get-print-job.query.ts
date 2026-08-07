import type { BarId } from '@coaster/common';

export class GetPrintJobQuery {
  constructor(
    public readonly barId: BarId,
    public readonly jobId: string,
  ) {}
}
